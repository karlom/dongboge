#!/usr/bin/env node

/**
 * 增量上传脚本
 *
 * 这个脚本用于增量上传静态资源到腾讯云COS，只上传新增或修改的文件
 * 通过比较文件的哈希值来判断文件是否发生变化
 * 清单文件存储在：https://dongboge-1251880339.cos.ap-guangzhou.myqcloud.com/.upload-manifest.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const COS = require('cos-nodejs-sdk-v5');

// 配置信息
const config = {
    bucket: 'dongboge-1251880339',
    region: 'ap-guangzhou',
    manifestKey: '.upload-manifest.json',
    manifestUrl: 'https://dongboge-1251880339.cos.ap-guangzhou.myqcloud.com/.upload-manifest.json',
    uploadDirs: ['assets', 'fonts', 'images'],
    distPath: path.join(__dirname, '../dist'),
};

// 初始化COS客户端
const cos = new COS({
    SecretId: process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY,
});

/**
 * 计算文件的MD5哈希值
 */
function calculateFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
        console.error(`计算文件哈希失败: ${filePath}`, error.message);
        return null;
    }
}

/**
 * 从CDN下载现有的清单文件
 */
async function downloadManifest() {
    console.log('📥 下载现有清单文件...');
    console.log(`清单文件URL: ${config.manifestUrl}`);

    return new Promise((resolve) => {
        https.get(config.manifestUrl, (res) => {
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const manifest = JSON.parse(data);
                        console.log(`✅ 成功下载清单文件，包含 ${Object.keys(manifest).length} 个文件记录`);
                        resolve(manifest);
                    } catch (parseError) {
                        console.log('清单文件格式错误，将创建新的清单');
                        resolve({});
                    }
                });
            } else if (res.statusCode === 404) {
                console.log('清单文件不存在，将创建新的清单');
                resolve({});
            } else {
                console.log(`下载清单文件失败，状态码: ${res.statusCode}，将使用空清单`);
                resolve({});
            }
        }).on('error', (error) => {
            console.error('下载清单文件时发生错误:', error.message);
            console.log('将使用空清单继续...');
            resolve({});
        });
    });
}

/**
 * 扫描本地文件并生成新清单
 */
function scanLocalFiles() {
    console.log('📁 扫描本地文件...');

    const localManifest = {};
    let totalFiles = 0;

    for (const dir of config.uploadDirs) {
        const dirPath = path.join(config.distPath, dir);

        if (!fs.existsSync(dirPath)) {
            console.log(`⚠️  目录不存在: ${dir}`);
            continue;
        }

        // 递归扫描目录
        function scanDirectory(currentPath, relativePath = '') {
            const files = fs.readdirSync(currentPath);

            for (const file of files) {
                const fullPath = path.join(currentPath, file);
                const relativeFilePath = path.join(relativePath, file).replace(/\\/g, '/');
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath, relativeFilePath);
                } else {
                    const hash = calculateFileHash(fullPath);
                    if (hash) {
                        const key = path.join(dir, relativeFilePath).replace(/\\/g, '/');
                        localManifest[key] = hash;
                        totalFiles++;
                    }
                }
            }
        }

        scanDirectory(dirPath);
    }

    console.log(`✅ 扫描完成，发现 ${totalFiles} 个文件`);
    return localManifest;
}

/**
 * 对比清单，找出需要上传的文件
 */
function compareManifests(remoteManifest, localManifest) {
    console.log('🔍 对比文件变化...');

    const toUpload = [];
    const unchanged = [];

    for (const [filePath, localHash] of Object.entries(localManifest)) {
        const remoteHash = remoteManifest[filePath];

        if (!remoteHash || remoteHash !== localHash) {
            toUpload.push(filePath);
        } else {
            unchanged.push(filePath);
        }
    }

    console.log(`📊 对比结果:`);
    console.log(`   - 需要上传: ${toUpload.length} 个文件`);
    console.log(`   - 无需上传: ${unchanged.length} 个文件`);

    if (toUpload.length > 0) {
        console.log(`📋 需要上传的文件:`);
        toUpload.forEach(file => console.log(`   - ${file}`));
    }

    return { toUpload, unchanged };
}

/**
 * 上传单个文件到COS
 */
async function uploadFile(filePath) {
    const localPath = path.join(config.distPath, filePath);

    try {
        const result = await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: config.bucket,
                Region: config.region,
                Key: filePath,
                Body: fs.createReadStream(localPath),
                ContentLength: fs.statSync(localPath).size,
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        console.log(`   ✅ ${filePath}`);
        return true;
    } catch (error) {
        console.error(`   ❌ ${filePath} - ${error.message}`);
        return false;
    }
}

/**
 * 批量上传文件
 */
async function uploadFiles(filesToUpload) {
    if (filesToUpload.length === 0) {
        console.log('🎉 没有文件需要上传！');
        return true;
    }

    console.log(`☁️  开始上传 ${filesToUpload.length} 个文件...`);

    let successCount = 0;
    let failCount = 0;

    // 并发上传，限制并发数为5
    const concurrency = 5;
    for (let i = 0; i < filesToUpload.length; i += concurrency) {
        const batch = filesToUpload.slice(i, i + concurrency);
        const promises = batch.map(file => uploadFile(file));
        const results = await Promise.all(promises);

        results.forEach(success => {
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        });
    }

    console.log(`📊 上传完成: ${successCount} 成功, ${failCount} 失败`);
    return failCount === 0;
}

/**
 * 上传新的清单文件到CDN
 */
async function uploadManifest(manifest) {
    console.log('📤 上传新的清单文件...');

    try {
        const manifestContent = JSON.stringify(manifest, null, 2);

        await new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: config.bucket,
                Region: config.region,
                Key: config.manifestKey,
                Body: manifestContent,
                ContentType: 'application/json',
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        console.log(`✅ 清单文件上传成功: ${config.manifestUrl}`);
        return true;
    } catch (error) {
        console.error('❌ 清单文件上传失败:', error.message);
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始增量上传到CDN...\n');

    try {
        // 检查必要的环境变量
        const secretId = process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID;
        const secretKey = process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;

        if (!secretId || !secretKey) {
            throw new Error('缺少必要的环境变量: COS_SECRET_ID/TENCENT_SECRET_ID, COS_SECRET_KEY/TENCENT_SECRET_KEY');
        }

        // 检查dist目录是否存在
        if (!fs.existsSync(config.distPath)) {
            throw new Error(`构建目录不存在: ${config.distPath}`);
        }

        console.log(`配置信息:`);
        console.log(`- 存储桶: ${config.bucket}`);
        console.log(`- 区域: ${config.region}`);
        console.log(`- 清单文件: ${config.manifestUrl}`);
        console.log(`- 上传目录: ${config.uploadDirs.join(', ')}`);
        console.log('');

        // 1. 下载现有清单
        const remoteManifest = await downloadManifest();

        // 2. 扫描本地文件
        const localManifest = scanLocalFiles();

        // 3. 对比找出变化
        const { toUpload } = compareManifests(remoteManifest, localManifest);

        // 4. 上传变化的文件
        const uploadSuccess = await uploadFiles(toUpload);

        // 5. 上传新的清单文件
        if (uploadSuccess && toUpload.length > 0) {
            await uploadManifest(localManifest);
        }

        console.log('\n🎉 增量上传完成！');

        // 输出统计信息
        const totalFiles = Object.keys(localManifest).length;
        const uploadedFiles = toUpload.length;
        const skippedFiles = totalFiles - uploadedFiles;

        console.log(`📊 统计信息:`);
        console.log(`   - 总文件数: ${totalFiles}`);
        console.log(`   - 上传文件: ${uploadedFiles}`);
        console.log(`   - 跳过文件: ${skippedFiles}`);

        if (skippedFiles > 0) {
            const savedPercent = Math.round((skippedFiles / totalFiles) * 100);
            console.log(`   - 节省上传: ${savedPercent}%`);
        }

        console.log(`\n清单文件位置: ${config.manifestUrl}`);

    } catch (error) {
        console.error('❌ 增量上传失败:', error.message);
        process.exit(1);
    }
}

// 执行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('执行脚本时发生错误:', error);
        process.exit(1);
    });
}

module.exports = { main };