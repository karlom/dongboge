#!/usr/bin/env node

/**
 * 检查CDN上的assets映射情况
 * 验证_astro目录下的图片是否都正确复制到了assets目录
 */

import fs from 'fs';
import path from 'path';

// 手动加载.env文件
function loadEnvFile() {
    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnvFile();

// 检查COS SDK是否可用
function checkCOSSDK() {
    try {
        require.resolve('cos-nodejs-sdk-v5');
        return true;
    } catch (error) {
        console.warn('⚠️ COS SDK未安装，无法检查CDN文件');
        return false;
    }
}

// 加载assets映射清单
function loadAssetsMappingManifest() {
    const manifestPath = '.assets-mapping-manifest.json';

    try {
        if (fs.existsSync(manifestPath)) {
            const content = fs.readFileSync(manifestPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn('⚠️ 无法加载assets映射清单');
    }

    return {};
}

// 检查CDN上的文件是否存在
async function checkCDNFileExists(cos, filePath) {
    try {
        await new Promise((resolve, reject) => {
            cos.headObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: filePath
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return true;
    } catch (error) {
        return false;
    }
}

// 列出CDN上_astro目录下的所有图片文件
async function listAstroImages(cos) {
    try {
        const result = await new Promise((resolve, reject) => {
            cos.getBucket({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Prefix: '_astro/',
                MaxKeys: 1000
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        // 过滤出图片文件
        const imageFiles = result.Contents.filter(item =>
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.Key)
        ).map(item => item.Key);

        return imageFiles;
    } catch (error) {
        console.error('❌ 获取_astro目录文件列表失败:', error.message);
        return [];
    }
}

// 列出CDN上assets目录下的所有图片文件
async function listAssetsImages(cos) {
    try {
        const result = await new Promise((resolve, reject) => {
            cos.getBucket({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Prefix: 'assets/',
                MaxKeys: 1000
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        // 过滤出图片文件
        const imageFiles = result.Contents.filter(item =>
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.Key)
        ).map(item => item.Key);

        return imageFiles;
    } catch (error) {
        console.error('❌ 获取assets目录文件列表失败:', error.message);
        return [];
    }
}

// 主检查函数
async function checkAssetsMappingStatus() {
    console.log('🔍 开始检查CDN上的assets映射状态...\n');

    try {
        // 检查环境变量
        const requiredEnvs = ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_COS_BUCKET'];
        const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

        if (missingEnvs.length > 0) {
            console.error(`❌ 缺少必要的环境变量: ${missingEnvs.join(', ')}`);
            return;
        }

        // 检查COS SDK
        if (!checkCOSSDK()) {
            return;
        }

        // 初始化COS客户端
        const COS = require('cos-nodejs-sdk-v5');
        const cos = new COS({
            SecretId: process.env.TENCENT_SECRET_ID,
            SecretKey: process.env.TENCENT_SECRET_KEY,
        });

        console.log(`📦 检查COS Bucket: ${process.env.TENCENT_COS_BUCKET}`);
        console.log(`🌍 区域: ${process.env.TENCENT_COS_REGION || 'ap-guangzhou'}\n`);

        // 1. 获取_astro目录下的所有图片文件
        console.log('📋 获取_astro目录下的图片文件...');
        const astroImages = await listAstroImages(cos);
        console.log(`找到 ${astroImages.length} 个_astro图片文件\n`);

        if (astroImages.length === 0) {
            console.log('✅ _astro目录下没有图片文件，无需检查映射');
            return;
        }

        // 2. 获取assets目录下的所有图片文件
        console.log('📋 获取assets目录下的图片文件...');
        const assetsImages = await listAssetsImages(cos);
        console.log(`找到 ${assetsImages.length} 个assets图片文件\n`);

        // 3. 加载本地映射清单
        const mappingManifest = loadAssetsMappingManifest();
        const manifestCount = Object.keys(mappingManifest).length;
        console.log(`📄 本地映射清单记录: ${manifestCount} 个映射\n`);

        // 4. 检查每个_astro图片是否有对应的assets映射
        console.log('🔍 检查映射状态:');
        console.log('='.repeat(80));

        let mappedCount = 0;
        let missingCount = 0;
        const missingMappings = [];

        for (const astroFile of astroImages) {
            const fileName = path.basename(astroFile);
            const expectedAssetsPath = `assets/${fileName}`;

            // 检查CDN上是否存在对应的assets文件
            const assetsExists = assetsImages.includes(expectedAssetsPath);

            // 检查本地清单中是否有记录
            const inManifest = mappingManifest.hasOwnProperty(expectedAssetsPath);

            if (assetsExists) {
                console.log(`✅ ${astroFile} -> ${expectedAssetsPath} ${inManifest ? '(已记录)' : '(未记录)'}`);
                mappedCount++;
            } else {
                console.log(`❌ ${astroFile} -> ${expectedAssetsPath} (缺失)`);
                missingCount++;
                missingMappings.push({
                    source: astroFile,
                    target: expectedAssetsPath
                });
            }
        }

        // 5. 输出统计结果
        console.log('='.repeat(80));
        console.log('\n📊 映射状态统计:');
        console.log(`  🎯 _astro图片总数: ${astroImages.length}`);
        console.log(`  ✅ 已映射到assets: ${mappedCount}`);
        console.log(`  ❌ 缺失映射: ${missingCount}`);
        console.log(`  📄 本地清单记录: ${manifestCount}`);

        // 6. 如果有缺失的映射，提供修复建议
        if (missingCount > 0) {
            console.log('\n⚠️ 发现缺失的映射:');
            missingMappings.forEach(mapping => {
                console.log(`  - ${mapping.source} -> ${mapping.target}`);
            });

            console.log('\n💡 修复建议:');
            console.log('  1. 运行部署脚本重新创建映射');
            console.log('  2. 或者手动运行: node scripts/fix-missing-assets-mapping.js');
        } else {
            console.log('\n🎉 所有_astro图片都已正确映射到assets目录！');
        }

        // 7. 检查是否有多余的assets文件（不在_astro中）
        const extraAssets = assetsImages.filter(assetsFile => {
            const fileName = path.basename(assetsFile);
            return !astroImages.some(astroFile => path.basename(astroFile) === fileName);
        });

        if (extraAssets.length > 0) {
            console.log(`\n📋 发现 ${extraAssets.length} 个额外的assets文件（不在_astro中）:`);
            extraAssets.forEach(file => {
                console.log(`  - ${file}`);
            });
        }

    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        console.error(error.stack);
    }
}

// 运行检查
checkAssetsMappingStatus();