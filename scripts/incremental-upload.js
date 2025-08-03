#!/usr/bin/env node

/**
 * 增量上传脚本
 * 
 * 这个脚本用于增量上传静态资源到腾讯云COS，只上传新增或修改的文件
 * 通过比较文件的哈希值来判断文件是否发生变化
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const COS = require('cos-nodejs-sdk-v5');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// 配置
const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
});

const distPath = path.join(process.cwd(), 'dist');
const manifestPath = path.join(process.cwd(), '.upload-manifest.json');
const maxRetries = 3;
const retryDelay = 1000;
const batchSize = 5;

// 计算文件哈希值
async function calculateFileHash(filePath) {
    const content = await readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

// 加载上一次上传的文件清单
async function loadManifest() {
    try {
        if (fs.existsSync(manifestPath)) {
            const content = await readFile(manifestPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn('无法加载上传清单，将创建新的清单:', error.message);
    }
    return {};
}

// 保存上传清单
async function saveManifest(manifest) {
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('上传清单已保存');
}

// 上传单个文件（带重试）
async function uploadFile(localPath, cosPath) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            await cos.putObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: 'ap-guangzhou',
                Key: cosPath,
                Body: fs.createReadStream(localPath),
                Headers: {
                    // 设置CORS头，特别是对字体文件
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, HEAD',
                    'Cache-Control': 'max-age=31536000', // 1年缓存
                }
            });
            console.log(`上传成功: ${cosPath}`);
            return true;
        } catch (err) {
            attempts++;
            console.error(`上传失败 (尝试 ${attempts}/${maxRetries}): ${localPath} ${err}`);

            if (attempts < maxRetries) {
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
            } else {
                return false;
            }
        }
    }
}

// 递归获取目录中的所有文件
async function getAllFiles(dir, baseDir = dir) {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath, baseDir);
            files.push(...subFiles);
        } else {
            files.push({
                path: fullPath,
                relativePath: path.relative(baseDir, fullPath)
            });
        }
    }

    return files;
}

// 批量上传文件
async function uploadBatch(files, manifest) {
    const failedFiles = [];
    const newManifest = { ...manifest };

    // 按批次处理文件
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map(async (file) => {
            try {
                const fileHash = await calculateFileHash(file.path);
                const cosPath = file.relativePath.replace(/\\/g, '/');

                // 检查文件是否已存在且哈希值相同
                if (manifest[cosPath] === fileHash) {
                    console.log(`跳过未修改的文件: ${cosPath}`);
                    return { success: true, path: cosPath, hash: fileHash };
                }

                // 上传新文件或已修改的文件
                const success = await uploadFile(file.path, cosPath);

                if (success) {
                    return { success: true, path: cosPath, hash: fileHash };
                } else {
                    return { success: false, path: cosPath };
                }
            } catch (error) {
                console.error(`处理文件时出错: ${file.path}`, error);
                return { success: false, path: file.relativePath };
            }
        });

        const results = await Promise.all(promises);

        // 更新清单和失败列表
        results.forEach(result => {
            if (result.success) {
                newManifest[result.path] = result.hash;
            } else {
                failedFiles.push(result.path);
            }
        });

        // 每批次完成后保存清单
        await saveManifest(newManifest);
    }

    return { failedFiles, newManifest };
}

// 刷新CDN缓存
async function refreshCDN() {
    const cdnDomain = process.env.CDN_DOMAIN;
    if (!cdnDomain) {
        console.warn('未设置CDN_DOMAIN环境变量，跳过CDN刷新');
        return;
    }

    try {
        // 刷新整个站点
        await cos.request({
            Method: 'POST',
            Key: 'cdn/refresh',
            Pathname: '/cdn/refresh',
            Body: JSON.stringify({
                "Paths": [
                    `https://${cdnDomain}/assets/`,
                    `https://${cdnDomain}/fonts/`,
                    `https://${cdnDomain}/images/`
                ],
                "FlushType": "flush"
            })
        });
        console.log('CDN缓存刷新请求已发送');
    } catch (error) {
        console.error('刷新CDN缓存失败:', error);
    }
}

// 主函数
async function main() {
    console.log('开始增量上传静态资源到腾讯云COS...');

    try {
        // 加载上一次上传的文件清单
        const manifest = await loadManifest();
        console.log(`已加载上传清单，包含 ${Object.keys(manifest).length} 个文件记录`);

        // 获取所有需要上传的文件
        const assetsFiles = await getAllFiles(path.join(distPath, 'assets'), distPath);
        const fontsFiles = await getAllFiles(path.join(distPath, 'fonts'), distPath);
        const imagesPath = path.join(distPath, 'images');
        let imagesFiles = [];

        if (fs.existsSync(imagesPath)) {
            imagesFiles = await getAllFiles(imagesPath, distPath);
        }

        const allFiles = [...assetsFiles, ...fontsFiles, ...imagesFiles];
        console.log(`找到 ${allFiles.length} 个文件需要检查`);

        // 上传文件
        const { failedFiles, newManifest } = await uploadBatch(allFiles, manifest);

        // 刷新CDN缓存
        await refreshCDN();

        // 总结
        console.log('\n===== 上传总结 =====');
        console.log(`总文件数: ${allFiles.length}`);
        console.log(`成功上传: ${allFiles.length - failedFiles.length}`);
        console.log(`跳过未修改: ${Object.keys(manifest).length - (Object.keys(newManifest).length - Object.keys(manifest).length)}`);
        console.log(`失败: ${failedFiles.length}`);

        if (failedFiles.length > 0) {
            console.log('\n失败的文件:');
            failedFiles.forEach(file => console.log(`- ${file}`));
            process.exit(1);
        } else {
            console.log('\n所有文件上传成功！');
            process.exit(0);
        }
    } catch (error) {
        console.error('上传过程中发生错误:', error);
        process.exit(1);
    }
}

// 执行主函数
main();