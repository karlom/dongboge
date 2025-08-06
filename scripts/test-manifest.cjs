#!/usr/bin/env node

/**
 * 测试清单功能
 * 验证清单的读取、保存和比较逻辑
 */

const fs = require('fs');
const path = require('path');

process.env.COS_COMPATIBILITY_MODE = 'true';
const COS = require('cos-nodejs-sdk-v5');

const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
});

const manifestKey = '.upload-manifest.json';

async function testManifest() {
    console.log('🧪 测试清单功能...\n');

    try {
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
        console.log(`🌍 使用Region: ${region}\n`);
        // 1. 测试读取清单
        console.log('1️⃣ 测试读取清单...');
        const manifest = await loadManifest();
        console.log(`   📋 清单包含 ${Object.keys(manifest).length} 个文件记录\n`);

        // 2. 测试保存清单
        console.log('2️⃣ 测试保存清单...');
        const testManifest = {
            ...manifest,
            'test-file.txt': {
                size: 123,
                mtime: Date.now(),
                uploadTime: new Date().toISOString()
            }
        };

        await saveManifest(testManifest);
        console.log('   ✅ 测试清单保存成功\n');

        // 3. 验证保存结果
        console.log('3️⃣ 验证保存结果...');
        const verifyManifest = await loadManifest();
        if (verifyManifest['test-file.txt']) {
            console.log('   ✅ 清单保存验证成功');
        } else {
            console.log('   ❌ 清单保存验证失败');
        }

        // 4. 清理测试数据
        console.log('\n4️⃣ 清理测试数据...');
        delete testManifest['test-file.txt'];
        await saveManifest(testManifest);
        console.log('   ✅ 测试数据已清理');

        console.log('\n🎉 清单功能测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

async function loadManifest() {
    try {
        const result = await new Promise((resolve, reject) => {
            cos.getObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: manifestKey
            }, (err, data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        console.log('   📝 清单文件不存在，返回空清单');
                        resolve({});
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const manifest = JSON.parse(data.Body.toString());
                        console.log('   ✅ 成功加载清单');
                        resolve(manifest);
                    } catch (parseError) {
                        console.warn('   ⚠️  清单文件格式错误，返回空清单');
                        resolve({});
                    }
                }
            });
        });
        return result;
    } catch (error) {
        console.warn('   ⚠️  加载清单失败，返回空清单:', error.message);
        return {};
    }
}

async function saveManifest(manifest) {
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
                console.log('   ✅ 清单保存成功');
                resolve(data);
            }
        });
    });
}

testManifest();