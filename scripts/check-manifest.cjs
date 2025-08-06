#!/usr/bin/env node

/**
 * 检查COS上传清单状态
 */

process.env.COS_COMPATIBILITY_MODE = 'true';
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
});

const manifestKey = '.upload-manifest.json';

async function checkManifest() {
    try {
        console.log('🔍 检查COS上传清单...');

        // 检查环境变量
        const bucket = process.env.TENCENT_COS_BUCKET;
        const region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

        if (!bucket) {
            console.error('❌ 环境变量 TENCENT_COS_BUCKET 未设置');
            console.log('💡 请设置正确的Bucket名称，格式：bucket-name-appid');
            return;
        }

        if (!bucket.match(/-\d+$/)) {
            console.error('❌ Bucket名称格式不正确');
            console.log(`💡 当前Bucket: ${bucket}`);
            console.log('💡 正确格式应该是: bucket-name-appid (例如: my-bucket-1234567890)');
            return;
        }

        console.log(`📦 使用Bucket: ${bucket}`);
        console.log(`🌍 使用Region: ${region}`);

        const result = await new Promise((resolve, reject) => {
            cos.getObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: manifestKey
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        console.log('📝 清单文件不存在');
                        resolve(null);
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const manifest = JSON.parse(data.Body.toString());
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn('⚠️  清单文件格式错误');
                        resolve(null);
                    }
                }
            });
        });

        if (result) {
            const files = Object.keys(result);
            console.log(`📋 清单包含 ${files.length} 个文件记录`);

            // 显示最近的几个文件
            console.log('\n📄 最近记录的文件:');
            files.slice(0, 10).forEach(file => {
                const entry = result[file];
                if (typeof entry === 'object') {
                    console.log(`  ${file} (${entry.size} bytes, ${new Date(entry.mtime).toLocaleString()})`);
                } else {
                    console.log(`  ${file} (旧格式: ${entry})`);
                }
            });

            if (files.length > 10) {
                console.log(`  ... 还有 ${files.length - 10} 个文件`);
            }
        } else {
            console.log('❌ 没有找到有效的清单文件');
        }

    } catch (error) {
        console.error('❌ 检查清单失败:', error.message);
    }
}

checkManifest();