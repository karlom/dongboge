#!/usr/bin/env node

/**
 * 快速COS上传脚本
 * 
 * 极致优化版本，专注于速度：
 * 1. 大幅增加并行数量
 * 2. 跳过哈希计算（基于文件大小和修改时间）
 * 3. 简化清单结构
 * 4. 减少API调用
 * 5. 智能文件过滤
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

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
const manifestKey = '.fast-manifest.json';
const maxRetries = 1; // 只重试一次
const batchSize = 50; // 大幅增加并行数量
const skipHashCheck = true; // 跳过哈希检查，只基于文件大小和修改时间

// 简化的清单结构
let fastManifest = {};

// 快速文件扫描 - 只获取必要信息
async function fastScanFiles(dir, baseDir = dir) {
    const files = [];
    
    try {
        const entries = await readdir(dir, { withFileTypes: true });

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
                    
                    files.push({
                        path: fullPath,
                        cosPath: relativePath,
                        size: stats.size,
                        mtime: stats.mtimeMs // 使用毫秒时间戳，更精确
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

// 快速判断是否需要上传
function needsUpload(file, manifest) {
    const entry = manifest[file.cosPath];
    if (!entry) return true;
    
    // 只比较文件大小和修改时间，跳过哈希计算
    return entry.size !== file.size || entry.mtime !== file.mtime;
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
    const needUpload = files.filter(file => needsUpload(file, manifest));
    const skipCount = files.length - needUpload.length;
    
    console.log(`📊 需要上传: ${needUpload.length}, 跳过: ${skipCount}`);
    
    if (needUpload.length === 0) {
        return { uploaded: 0, failed: 0, skipped: skipCount };
    }

    let uploaded = 0;
    let failed = 0;
    const newManifest = { ...manifest };

    // 超大批次并行上传
    for (let i = 0; i < needUpload.length; i += batchSize) {
        const batch = needUpload.slice(i, i + batchSize);
        
        console.log(`🚀 批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 个文件`);

        const results = await Promise.allSettled(
            batch.map(async (file) => {
                const success = await fastUpload(file);
                return { file, success };
            })
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
                const { file } = result.value;
                uploaded++;
                newManifest[file.cosPath] = {
                    size: file.size,
                    mtime: file.mtime
                };
                process.stdout.write('✅');
            } else {
                failed++;
                process.stdout.write('❌');
            }
        });

        console.log(` (${uploaded + failed}/${needUpload.length})`);
    }

    // 快速保存清单
    try {
        await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: manifestKey,
                Body: JSON.stringify(newManifest),
                Headers: { 'Content-Type': 'application/json' }
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    } catch (err) {
        console.warn('⚠️  保存清单失败:', err.message);
    }

    return { uploaded, failed, skipped: skipCount };
}

// 主函数
async function main() {
    const startTime = Date.now();
    console.log('⚡ 启动快速COS上传...');

    try {
        // 并行加载清单和扫描文件
        const [manifest, ...fileLists] = await Promise.all([
            loadFastManifest(),
            fastScanFiles(path.join(distPath, 'assets'), distPath),
            fastScanFiles(path.join(distPath, 'fonts'), distPath),
            fastScanFiles(path.join(distPath, 'images'), distPath)
        ]);

        const allFiles = fileLists.flat();
        console.log(`📁 扫描到 ${allFiles.length} 个文件`);

        if (allFiles.length === 0) {
            console.log('✅ 没有文件需要处理');
            return;
        }

        // 超快速上传
        const { uploaded, failed, skipped } = await ultraFastUpload(allFiles, manifest);

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