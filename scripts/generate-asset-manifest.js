#!/usr/bin/env node

/**
 * 生成资源映射清单
 * 将原始文件名映射到构建后的带hash文件名
 */

import fs from 'fs';
import path from 'path';

const distPath = path.join(process.cwd(), 'dist');
const astroPath = path.join(distPath, 'client', '_astro');
const manifestPath = path.join(distPath, 'client', 'asset-manifest.json');

// 扫描_astro目录，生成映射
function generateAssetManifest() {
    const manifest = {};

    if (!fs.existsSync(astroPath)) {
        console.log('⚠️ _astro目录不存在，跳过生成资源映射');
        return;
    }

    const files = fs.readdirSync(astroPath);

    files.forEach(file => {
        // 只处理图片文件
        if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
            return;
        }

        // 提取原始文件名
        // 例如：success2.DnpSl9pE.jpg -> success2.jpg
        const match = file.match(/^(.+?)\.([a-zA-Z0-9_-]+)\.(jpg|jpeg|png|gif|webp|svg)$/i);
        if (match) {
            const originalName = `${match[1]}.${match[3]}`;
            const hashedName = file;

            // 如果已经存在映射，选择较短的hash版本（通常是主要版本）
            if (!manifest[originalName] || hashedName.length < manifest[originalName].length) {
                manifest[originalName] = hashedName;
            }
        }
    });

    // 确保目录存在
    const manifestDir = path.dirname(manifestPath);
    if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, {
            recursive: true
        });
    }

    // 写入映射文件
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`✅ 生成资源映射清单: ${Object.keys(manifest).length} 个文件`);
    console.log(`📄 清单文件: ${manifestPath}`);

    // 显示一些示例映射
    const examples = Object.entries(manifest).slice(0, 5);
    if (examples.length > 0) {
        console.log('📋 映射示例:');
        examples.forEach(([original, hashed]) => {
            console.log(`  ${original} -> ${hashed}`);
        });
    }
}

// 执行生成
generateAssetManifest();