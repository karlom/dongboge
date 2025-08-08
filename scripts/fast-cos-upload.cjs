#!/usr/bin/env node

/**
 * 快速COS上传脚本
 * 
 * 极致优化版本，专注于速度：
 * 1. 大幅增加并行数量
 * 2. 跳过哈希计算（只基于文件大小判断）
 * 3. 简化清单结构
 * 4. 减少API调用
 * 5. 智能文件过滤
 * 6. 修复：不再依赖修改时间，避免构建过程中的重复上传
 */

const fs = require('fs');
const path = require('path');
const {
    promisify
} = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

process.env.COS_COMPATIBILITY_MODE = 'true';
const COS = require('cos-nodejs-sdk-v5');

// 极速配置
const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
    Timeout: 30000, // 减少超时时间
});

const distPath = path.join(process.cwd(), 'dist');
const manifestKey = '.upload-manifest.json';
const maxRetries = 1; // 只重试一次
const batchSize = 50; // 大幅增加并行数量
const skipHashCheck = true; // 跳过哈希检查，只基于文件大小和修改时间

// 简化的清单结构
let fastManifest = {};

// 快速文件扫描 - 只获取必要信息
async function fastScanFiles(dir, baseDir = dir) {
    const files = [];

    try {
        const entries = await readdir(dir, {
            withFileTypes: true
        });

        await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const subFiles = await fastScanFiles(fullPath, baseDir);
                files.push(...subFiles);
            } else {
                // 快速过滤不需要的文件
                const ext = path.extname(entry.name).toLowerCase();
                if (['.map', '.txt', '.md', '.json'].includes(ext)) {
                    return;
                }

                try {
                    const stats = await stat(fullPath);
                    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

                    // 处理路径映射：移除client/前缀
                    let cosPath = relativePath;
                    if (cosPath.startsWith('client/')) {
                        cosPath = cosPath.substring('client/'.length);
                    }

                    files.push({
                        path: fullPath,
                        cosPath: cosPath,
                        size: stats.size
                    });
                } catch (err) {
                    // 忽略无法访问的文件
                }
            }
        }));
    } catch (err) {
        console.warn(`⚠️  无法扫描目录 ${dir}:`, err.message);
    }

    return files;
}

// 快速加载清单
async function loadFastManifest() {
    try {
        const result = await new Promise((resolve, reject) => {
            cos.getObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: manifestKey
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        resolve({});
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        resolve(JSON.parse(data.Body.toString()));
                    } catch (parseError) {
                        resolve({});
                    }
                }
            });
        });

        console.log(`📋 加载清单: ${Object.keys(result).length} 个文件记录`);
        return result;
    } catch (error) {
        console.log('📝 创建新清单');
        return {};
    }
}

// 快速判断是否需要上传 - 修复：只基于文件大小判断
function needsUpload(file, manifest) {
    const entry = manifest[file.cosPath];
    if (!entry) {
        console.log(`🆕 新文件: ${file.cosPath}`);
        return true;
    }

    // 只比较文件大小，不比较修改时间（避免构建过程中时间变化导致重复上传）
    const sizeChanged = entry.size !== file.size;

    if (sizeChanged) {
        console.log(`🔄 文件大小变更: ${file.cosPath} (${entry.size} -> ${file.size})`);
        return true;
    }

    // 文件大小相同，跳过上传
    return false;
}

// 快速上传文件
async function fastUpload(file) {
    try {
        await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: file.cosPath,
                Body: fs.createReadStream(file.path),
                Headers: {
                    'Cache-Control': 'max-age=31536000',
                }
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        return true;
    } catch (err) {
        console.error(`❌ ${file.cosPath}: ${err.message}`);
        return false;
    }
}

// 超快速批量上传
async function ultraFastUpload(files, manifest) {
    console.log(`🔍 检查文件变更...`);
    const needUpload = files.filter(file => needsUpload(file, manifest));
    const skipCount = files.length - needUpload.length;

    console.log(`📊 需要上传: ${needUpload.length}, 跳过: ${skipCount}`);

    if (needUpload.length === 0) {
        return {
            uploaded: 0,
            failed: 0,
            skipped: skipCount
        };
    }

    let uploaded = 0;
    let failed = 0;
    const newManifest = {
        ...manifest
    };

    // 超大批次并行上传
    for (let i = 0; i < needUpload.length; i += batchSize) {
        const batch = needUpload.slice(i, i + batchSize);

        console.log(`🚀 批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 个文件`);

        const results = await Promise.allSettled(
            batch.map(async (file) => {
                const success = await fastUpload(file);
                return {
                    file,
                    success
                };
            })
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
                const {
                    file
                } = result.value;
                uploaded++;
                newManifest[file.cosPath] = {
                    size: file.size,
                    uploadTime: new Date().toISOString()
                };
                process.stdout.write('✅');
            } else {
                failed++;
                process.stdout.write('❌');
            }
        });

        console.log(` (${uploaded + failed}/${needUpload.length})`);
    }

    // 保存清单到COS
    if (uploaded > 0) {
        try {
            console.log('\n💾 保存上传清单到COS...');
            await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket: process.env.TENCENT_COS_BUCKET,
                    Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                    Key: manifestKey,
                    Body: JSON.stringify(newManifest, null, 2),
                    Headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            console.log(`✅ 清单已保存 (${Object.keys(newManifest).length} 个文件记录)`);
        } catch (err) {
            console.error('❌ 保存清单失败:', err.message);
            console.error('⚠️  下次部署可能会重新上传所有文件');
        }
    } else {
        console.log('📋 没有新文件上传，跳过清单更新');
    }

    return {
        uploaded,
        failed,
        skipped: skipCount
    };
}

// 主函数
async function main() {
    const startTime = Date.now();
    console.log('⚡ 启动快速COS上传...');

    try {
        // 加载清单
        const manifest = await loadFastManifest();

        // 扫描静态资源目录 - 根据实际构建输出结构
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

        const allFiles = [];
        for (const scanPath of scanPaths) {
            if (fs.existsSync(scanPath.path)) {
                const files = await fastScanFiles(scanPath.path, distPath);
                console.log(`📂 ${scanPath.name}: ${files.length} 个文件`);
                allFiles.push(...files);
            }
        }

        console.log(`📁 扫描到 ${allFiles.length} 个文件`);

        if (allFiles.length === 0) {
            console.log('✅ 没有文件需要处理');
            return;
        }

        // 超快速上传
        const {
            uploaded,
            failed,
            skipped
        } = await ultraFastUpload(allFiles, manifest);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n⚡ ===== 快速上传完成 =====');
        console.log(`⏱️  耗时: ${duration}秒`);
        console.log(`📁 总文件: ${allFiles.length}`);
        console.log(`✅ 上传: ${uploaded}`);
        console.log(`⏭️  跳过: ${skipped}`);
        console.log(`❌ 失败: ${failed}`);

        if (uploaded > 0) {
            console.log(`🚀 速度: ${(uploaded / parseFloat(duration)).toFixed(1)} 文件/秒`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ 快速上传失败:', error);
        process.exit(0);
    }
}

main().catch(console.error);