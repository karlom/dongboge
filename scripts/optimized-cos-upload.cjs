#!/usr/bin/env node

/**
 * 优化的COS上传脚本
 * 
 * 主要优化点：
 * 1. 增加并行上传数量
 * 2. 优化文件哈希计算
 * 3. 减少不必要的API调用
 * 4. 智能跳过策略
 * 5. 更好的错误处理和重试机制
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
    promisify
} = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

process.env.COS_COMPATIBILITY_MODE = 'true';
const COS = require('cos-nodejs-sdk-v5');

// 优化的配置
const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
    // 增加超时时间
    Timeout: 60000,
    // 启用分片上传
    SliceSize: 1024 * 1024 * 5, // 5MB
});

const distPath = path.join(process.cwd(), 'dist');
const manifestKey = '.upload-manifest.json';
const maxRetries = 2; // 减少重试次数
const retryDelay = 300; // 减少重试延迟
const batchSize = 20; // 增加并行上传数量
const maxFileSize = 1024 * 1024 * 10; // 10MB，超过此大小的文件使用分片上传

// 优化的文件哈希计算 - 对小文件使用更快的方法
async function calculateFileHash(filePath) {
    const stats = await stat(filePath);

    // 对于小文件，直接读取内容计算哈希
    if (stats.size < 1024 * 1024) { // 1MB以下
        const content = await readFile(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }

    // 对于大文件，使用流式处理
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath, {
            highWaterMark: 64 * 1024
        }); // 64KB chunks

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

// 优化的清单加载 - 添加缓存
let manifestCache = null;
async function loadManifestFromCOS() {
    if (manifestCache) return manifestCache;

    try {
        console.log('🔍 从COS下载上传清单...');
        const result = await new Promise((resolve, reject) => {
            cos.getObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
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

        manifestCache = result;
        return result;
    } catch (error) {
        console.warn('⚠️  无法从COS加载清单，创建新的清单:', error.message);
        manifestCache = {};
        return {};
    }
}

// 优化的清单保存 - 批量保存，减少API调用
let manifestSaveQueue = null;
async function saveManifestToCOS(manifest) {
    // 防抖保存，避免频繁调用
    if (manifestSaveQueue) {
        clearTimeout(manifestSaveQueue);
    }

    manifestSaveQueue = setTimeout(async () => {
        try {
            console.log('💾 保存清单到COS...');
            await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket: process.env.TENCENT_COS_BUCKET,
                    Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
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
        }
    }, 2000); // 2秒防抖
}

// 优化的文件上传 - 支持分片上传和更好的错误处理
async function uploadFile(localPath, cosPath) {
    let attempts = 0;
    const stats = await stat(localPath);

    while (attempts < maxRetries) {
        try {
            // 对于大文件使用分片上传
            if (stats.size > maxFileSize) {
                await new Promise((resolve, reject) => {
                    cos.sliceUploadFile({
                        Bucket: process.env.TENCENT_COS_BUCKET,
                        Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                        Key: cosPath,
                        FilePath: localPath,
                        Headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, HEAD',
                            'Cache-Control': 'max-age=31536000',
                        }
                    }, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            } else {
                // 小文件使用普通上传
                await new Promise((resolve, reject) => {
                    cos.putObject({
                        Bucket: process.env.TENCENT_COS_BUCKET,
                        Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                        Key: cosPath,
                        Body: fs.createReadStream(localPath),
                        Headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, HEAD',
                            'Cache-Control': 'max-age=31536000',
                        }
                    }, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
            }

            console.log(`✅ 上传成功: ${cosPath} (${(stats.size / 1024).toFixed(1)}KB)`);
            return true;
        } catch (err) {
            attempts++;
            console.error(`❌ 上传失败 (尝试 ${attempts}/${maxRetries}): ${cosPath} - ${err.message}`);

            if (attempts < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
            } else {
                return false;
            }
        }
    }
}

// 优化的文件扫描 - 添加文件过滤和排序
async function getAllFiles(dir, baseDir = dir) {
    const files = [];
    const entries = await readdir(dir, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath, baseDir);
            files.push(...subFiles);
        } else {
            // 跳过不需要上传的文件
            const ext = path.extname(entry.name).toLowerCase();
            if (['.map', '.txt', '.md'].includes(ext)) {
                continue;
            }

            const stats = await stat(fullPath);
            // 处理路径映射：移除client/前缀
            let relativePath = path.relative(baseDir, fullPath);
            if (relativePath.startsWith('client/')) {
                relativePath = relativePath.substring('client/'.length);
            }

            files.push({
                path: fullPath,
                relativePath: relativePath,
                size: stats.size,
                mtime: stats.mtime
            });
        }
    }

    // 按文件大小排序，小文件优先上传
    return files.sort((a, b) => a.size - b.size);
}

// 注意：智能跳过逻辑已整合到批量上传函数中，主要基于文件大小和内容哈希比较

// 优化的批量上传
async function uploadBatch(files, manifest) {
    const failedFiles = [];
    const newManifest = {
        ...manifest
    };
    let uploadedCount = 0;
    let skippedCount = 0;

    console.log(`📦 开始批量上传 ${files.length} 个文件...`);

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        console.log(`🚀 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)} (${batch.length} 个文件)`);

        const promises = batch.map(async (file) => {
            try {
                const cosPath = file.relativePath.replace(/\\/g, '/');

                // 检查清单中是否存在该文件
                const manifestEntry = manifest[cosPath];
                let fileHash = null;
                let shouldUpload = true;

                if (manifestEntry) {
                    // 如果文件大小不同，直接上传
                    if (manifestEntry.size && manifestEntry.size !== file.size) {
                        console.log(`📏 文件大小变化: ${cosPath} (${manifestEntry.size} -> ${file.size})`);
                        shouldUpload = true;
                    } else {
                        // 大小相同或未记录大小，计算哈希进行比较
                        fileHash = await calculateFileHash(file.path);

                        // 检查哈希是否相同
                        const existingHash = typeof manifestEntry === 'string' ? manifestEntry : manifestEntry.hash;
                        if (existingHash === fileHash) {
                            console.log(`⏭️  跳过未修改的文件: ${cosPath} (大小: ${file.size}, 哈希: ${fileHash.substring(0, 8)}...)`);
                            skippedCount++;
                            return {
                                success: true,
                                path: cosPath,
                                hash: fileHash,
                                skipped: true
                            };
                        } else {
                            console.log(`🔄 文件内容变化: ${cosPath} (大小: ${file.size} 未变, 哈希: ${existingHash && existingHash.substring(0, 8)}... -> ${fileHash.substring(0, 8)}...)`);
                            shouldUpload = true;
                        }
                    }
                } else {
                    console.log(`🆕 新文件: ${cosPath} (大小: ${file.size})`);
                    shouldUpload = true;
                }

                // 如果需要上传且还没计算哈希，现在计算
                if (shouldUpload && !fileHash) {
                    fileHash = await calculateFileHash(file.path);
                }

                // 上传文件
                const success = await uploadFile(file.path, cosPath);

                if (success) {
                    uploadedCount++;
                    return {
                        success: true,
                        path: cosPath,
                        hash: fileHash,
                        size: file.size,
                        mtime: file.mtime
                    };
                } else {
                    return {
                        success: false,
                        path: cosPath
                    };
                }
            } catch (error) {
                console.error(`❌ 处理文件时出错: ${file.path}`, error.message);
                return {
                    success: false,
                    path: file.relativePath
                };
            }
        });

        const results = await Promise.all(promises);

        // 更新清单
        results.forEach(result => {
            if (result.success && !result.skipped) {
                newManifest[result.path] = {
                    hash: result.hash,
                    size: result.size,
                    mtime: result.mtime,
                    uploadTime: new Date().toISOString()
                };
            } else if (!result.success) {
                failedFiles.push(result.path);
            }
        });

        // 显示进度
        const processed = Math.min((i + 1) * batchSize, files.length);
        console.log(`📊 进度: ${processed}/${files.length} (${((processed / files.length) * 100).toFixed(1)}%)`);
    }

    // 最终保存清单
    if (manifestSaveQueue) {
        clearTimeout(manifestSaveQueue);
    }
    await saveManifestToCOS(newManifest);

    return {
        failedFiles,
        newManifest,
        uploadedCount,
        skippedCount
    };
}

// 创建assets兼容性映射
async function createAssetsCompatibilityMapping(allFiles, manifest) {
    let mappingCount = 0;

    for (const file of allFiles) {
        const cosPath = file.relativePath.replace(/\\/g, '/');

        // 只处理_astro目录中的图片文件
        if (cosPath.startsWith('_astro/') && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cosPath)) {
            // 保持完整的带hash文件名
            // 例如：_astro/success2.DnpSl9pE.jpg -> assets/success2.DnpSl9pE.jpg
            const fileName = path.basename(cosPath);
            const assetsPath = `assets/${fileName}`;

            // 检查assets路径是否已经存在
            if (!manifest[assetsPath]) {
                try {
                    // 创建兼容性映射：将_astro中的文件复制到assets路径
                    await new Promise((resolve, reject) => {
                        cos.putObjectCopy({
                            Bucket: process.env.TENCENT_COS_BUCKET,
                            Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                            Key: assetsPath,
                            CopySource: `${process.env.TENCENT_COS_BUCKET}.cos.${process.env.TENCENT_COS_REGION || 'ap-guangzhou'}.myqcloud.com/${cosPath}`,
                            Headers: {
                                'Cache-Control': 'max-age=31536000',
                            }
                        }, (err, data) => {
                            if (err) reject(err);
                            else resolve(data);
                        });
                    });

                    console.log(`✅ 兼容性映射: ${cosPath} -> ${assetsPath}`);
                    mappingCount++;

                    // 更新清单
                    manifest[assetsPath] = {
                        hash: manifest[cosPath] && manifest[cosPath].hash || 'copied',
                        size: file.size,
                        mtime: file.mtime,
                        uploadTime: new Date().toISOString(),
                        mappedFrom: cosPath
                    };

                } catch (error) {
                    console.warn(`⚠️ 创建兼容性映射失败: ${cosPath} -> ${assetsPath}`, error.message);
                }
            }
        }
    }

    if (mappingCount > 0) {
        console.log(`✅ 创建了 ${mappingCount} 个兼容性映射`);

        // 保存更新后的清单
        try {
            await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket: process.env.TENCENT_COS_BUCKET,
                    Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                    Key: manifestKey,
                    Body: JSON.stringify(manifest, null, 2),
                    Headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            console.log('💾 兼容性映射已保存到清单');
        } catch (error) {
            console.warn('⚠️ 保存兼容性映射清单失败:', error.message);
        }
    } else {
        console.log('⏭️ 没有需要创建的兼容性映射');
    }
}

// 主函数
async function main() {
    const startTime = Date.now();
    console.log('🚀 开始优化的增量上传静态资源到腾讯云COS...');

    try {
        // 加载清单
        const manifest = await loadManifestFromCOS();

        // 扫描文件
        console.log('📁 扫描文件...');
        let allFiles = [];

        const scanPaths = [
            // 优先扫描client目录（server模式构建输出）
            {
                path: path.join(distPath, 'client', 'assets'),
                name: 'assets' // 上传到CDN的assets目录
            },
            {
                path: path.join(distPath, 'client', 'fonts'),
                name: 'fonts'
            },
            {
                path: path.join(distPath, 'client', 'images'),
                name: 'images'
            },
            {
                path: path.join(distPath, 'client', '_astro'),
                name: '_astro' // 重要：带hash的资源文件
            },
            // 兼容static模式构建输出
            {
                path: path.join(distPath, 'assets'),
                name: 'assets'
            },
            {
                path: path.join(distPath, 'fonts'),
                name: 'fonts'
            },
            {
                path: path.join(distPath, 'images'),
                name: 'images'
            },
            {
                path: path.join(distPath, '_astro'),
                name: '_astro'
            }
        ];

        for (const scanPath of scanPaths) {
            if (fs.existsSync(scanPath.path)) {
                const files = await getAllFiles(scanPath.path, distPath);
                console.log(`📂 ${scanPath.name}: ${files.length} 个文件`);
                allFiles.push(...files);
            }
        }

        console.log(`📋 总计找到 ${allFiles.length} 个文件需要检查`);

        if (allFiles.length === 0) {
            console.log('✅ 没有文件需要上传');
            return;
        }

        // 批量上传
        const {
            failedFiles,
            newManifest,
            uploadedCount,
            skippedCount
        } = await uploadBatch(allFiles, manifest);

        // 为_astro目录中的图片创建assets兼容性映射
        console.log('\n🔗 创建assets兼容性映射...');
        await createAssetsCompatibilityMapping(allFiles, newManifest);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        // 总结
        console.log('\n🎉 ===== 上传总结 =====');
        console.log(`⏱️  总耗时: ${duration}秒`);
        console.log(`📁 总文件数: ${allFiles.length}`);
        console.log(`✅ 成功上传: ${uploadedCount}`);
        console.log(`⏭️  跳过未修改: ${skippedCount}`);
        console.log(`❌ 失败: ${failedFiles.length}`);

        if (uploadedCount > 0) {
            console.log(`📈 平均上传速度: ${(uploadedCount / (duration / 60)).toFixed(1)} 文件/分钟`);
        }

        if (failedFiles.length > 0) {
            console.log('\n❌ 失败的文件:');
            failedFiles.forEach(file => console.log(`   - ${file}`));
        }

        console.log('\n🎊 上传完成！');
        process.exit(0);
    } catch (error) {
        console.error('❌ 上传过程中发生错误:', error);
        process.exit(0); // 不中断部署流程
    }
}

// 执行主函数
main().catch(error => {
    console.error('❌ 执行脚本时发生错误:', error);
    process.exit(0);
});