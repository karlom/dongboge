#!/usr/bin/env node

/**
 * 增量上传脚本
 *
 * 这个脚本用于增量上传静态资源到腾讯云COS，只上传新增或修改的文件
 * 通过比较文件的哈希值来判断文件是否发生变化
 */

// 使用纯CommonJS语法，避免任何ES模块的兼容性问题
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

// 使用promisify将回调函数转换为Promise
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// 在导入COS SDK之前，确保使用兼容模式
process.env.COS_COMPATIBILITY_MODE = 'true';
const COS = require('cos-nodejs-sdk-v5');

// 配置 - 使用GitHub Actions中配置的环境变量
const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
const bucket = process.env.TENCENT_COS_BUCKET || 'dongboge-1251880339';
const region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

// 验证环境变量
if (!secretId || !secretKey) {
    console.error('❌ 缺少必要的环境变量: TENCENT_SECRET_ID, TENCENT_SECRET_KEY');
    console.error('请在GitHub Secrets中配置这些环境变量');
    process.exit(1);
}

const cos = new COS({
    SecretId: secretId,
    SecretKey: secretKey
});

// 路径配置
const distPath = path.join(process.cwd(), 'dist');
const manifestKey = '.upload-manifest.json'; // 保存在COS中的清单文件路径
const maxRetries = 3;
const retryDelay = 1000;
const batchSize = 5;

console.log('🚀 开始增量上传到CDN...');
console.log(`📦 存储桶: ${bucket}`);
console.log(`🌍 区域: ${region}`);

// 计算文件哈希值
async function calculateFileHash(filePath) {
    const content = await readFile(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

// 从COS下载上传清单
async function loadManifestFromCOS() {
    try {
        console.log('🔍 从COS下载上传清单...');
        const result = await new Promise((resolve, reject) => {
            cos.getObject({
                Bucket: bucket,
                Region: region,
                Key: manifestKey
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        console.log('📝 清单文件不存在，将创建新的清单');
                        resolve({});
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const manifest = JSON.parse(data.Body.toString());
                        console.log(`✅ 成功加载清单，包含 ${Object.keys(manifest).length} 个文件记录`);
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn('⚠️  清单文件格式错误，创建新的清单');
                        resolve({});
                    }
                }
            });
        });
        return result;
    } catch (error) {
        console.warn('⚠️  无法从COS加载清单，创建新的清单:', error.message);
        return {};
    }
}

// 将上传清单保存到COS
async function saveManifestToCOS(manifest) {
    try {
        console.log('💾 保存清单到COS...');
        await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: bucket,
                Region: region,
                Key: manifestKey,
                Body: JSON.stringify(manifest, null, 2),
                Headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ 清单已保存到COS');
                    resolve(data);
                }
            });
        });
    } catch (error) {
        console.error('❌ 保存清单到COS失败:', error.message);
        // 不抛出错误，避免中断部署
    }
}

// 上传单个文件（带重试）
async function uploadFile(localPath, cosPath) {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket: bucket,
                    Region: region,
                    Key: cosPath,
                    Body: fs.createReadStream(localPath),
                    Headers: {
                        // 设置CORS头，特别是对字体文件
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, HEAD',
                        'Cache-Control': 'max-age=31536000' // 1年缓存
                    }
                }, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });

            console.log(`✅ 上传成功: ${cosPath}`);
            return true;
        } catch (err) {
            attempts++;
            console.error(`❌ 上传失败 (尝试 ${attempts}/${maxRetries}): ${localPath} - ${err.message}`);

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
    let uploadedCount = 0;
    let skippedCount = 0;

    // 按批次处理文件
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const promises = batch.map(async (file) => {
            try {
                const fileHash = await calculateFileHash(file.path);
                const cosPath = file.relativePath.replace(/\\/g, '/');

                // 检查文件是否已存在且哈希值相同
                if (manifest[cosPath] === fileHash) {
                    console.log(`⏭️  跳过未修改的文件: ${cosPath}`);
                    skippedCount++;
                    return { success: true, path: cosPath, hash: fileHash, skipped: true };
                }

                // 上传新文件或已修改的文件
                const success = await uploadFile(file.path, cosPath);

                if (success) {
                    uploadedCount++;
                    return { success: true, path: cosPath, hash: fileHash, skipped: false };
                } else {
                    return { success: false, path: cosPath };
                }
            } catch (error) {
                console.error(`❌ 处理文件时出错: ${file.path} - ${error.message}`);
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

        // 每批次完成后保存清单到COS
        await saveManifestToCOS(newManifest);
    }

    return { failedFiles, newManifest, uploadedCount, skippedCount };
}

// 主函数
async function main() {
    try {
        // 从COS加载上一次上传的文件清单
        const manifest = await loadManifestFromCOS();

        // 获取所有需要上传的文件
        let allFiles = [];

        const assetsPath = path.join(distPath, 'assets');
        const fontsPath = path.join(distPath, 'fonts');
        const imagesPath = path.join(distPath, 'images');

        if (fs.existsSync(assetsPath)) {
            const assetsFiles = await getAllFiles(assetsPath, distPath);
            allFiles.push(...assetsFiles);
            console.log(`📁 找到 ${assetsFiles.length} 个assets文件`);
        }

        if (fs.existsSync(fontsPath)) {
            const fontsFiles = await getAllFiles(fontsPath, distPath);
            allFiles.push(...fontsFiles);
            console.log(`🔤 找到 ${fontsFiles.length} 个fonts文件`);
        }

        if (fs.existsSync(imagesPath)) {
            const imagesFiles = await getAllFiles(imagesPath, distPath);
            allFiles.push(...imagesFiles);
            console.log(`🖼️  找到 ${imagesFiles.length} 个images文件`);
        }

        console.log(`📊 总共找到 ${allFiles.length} 个文件需要检查`);

        if (allFiles.length === 0) {
            console.log('📭 没有找到需要上传的文件');
            return;
        }

        // 上传文件
        const { failedFiles, newManifest, uploadedCount, skippedCount } = await uploadBatch(allFiles, manifest);

        // 总结
        console.log('\n📊 ===== 上传总结 =====');
        console.log(`📁 总文件数: ${allFiles.length}`);
        console.log(`✅ 成功上传: ${uploadedCount}`);
        console.log(`⏭️  跳过未修改: ${skippedCount}`);
        console.log(`❌ 失败: ${failedFiles.length}`);

        if (uploadedCount > 0) {
            const savedPercentage = Math.round((skippedCount / allFiles.length) * 100);
            console.log(`💰 节省上传: ${savedPercentage}%`);
        }

        if (failedFiles.length > 0) {
            console.log('\n❌ 失败的文件:');
            failedFiles.forEach(file => console.log(`   - ${file}`));
        }

        console.log('\n🎉 增量上传完成！');

    } catch (error) {
        console.error('❌ 上传过程中发生错误:', error.message);
        process.exit(1);
    }
}

// 执行主函数
main().catch(error => {
    console.error('❌ 执行脚本时发生错误:', error.message);
    process.exit(1);
});