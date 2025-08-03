/**
 * 腾讯云CDN测试脚本
 * 
 * 此脚本用于测试CDN配置是否正确
 * 使用方法: node scripts/test-cdn.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 从.env.production文件中读取CDN URL
function getCdnUrl() {
    try {
        const envContent = fs.readFileSync(path.join(process.cwd(), '.env.production'), 'utf8');
        const match = envContent.match(/PUBLIC_CDN_URL=['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('无法读取.env.production文件:', error.message);
        return null;
    }
}

// 测试CDN URL是否可访问
async function testCdnUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            console.log(`状态码: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log('✅ CDN URL可以正常访问');
                resolve(true);
            } else {
                console.log('❌ CDN URL无法正常访问');
                resolve(false);
            }
        }).on('error', (e) => {
            console.error(`❌ 请求出错: ${e.message}`);
            resolve(false);
        });
    });
}

// 测试常见静态资源路径
async function testCommonPaths(cdnUrl) {
    const paths = [
        '/assets/',
        '/fonts/',
        '/fonts/atkinson-regular.woff',
        '/Favicon.png'
    ];

    console.log('\n测试常见静态资源路径:');

    for (const path of paths) {
        const url = `${cdnUrl}${path}`;
        process.stdout.write(`测试 ${url} ... `);

        try {
            const result = await new Promise((resolve) => {
                https.get(url, (res) => {
                    if (res.statusCode === 200) {
                        process.stdout.write('✅ 成功\n');
                        resolve(true);
                    } else {
                        process.stdout.write(`❌ 失败 (状态码: ${res.statusCode})\n`);
                        resolve(false);
                    }
                }).on('error', (e) => {
                    process.stdout.write(`❌ 失败 (${e.message})\n`);
                    resolve(false);
                });
            });
        } catch (error) {
            process.stdout.write(`❌ 失败 (${error.message})\n`);
        }
    }
}

// 主函数
async function main() {
    console.log('🔍 腾讯云CDN配置测试\n');

    const cdnUrl = getCdnUrl();
    if (!cdnUrl) {
        console.error('❌ 未找到CDN URL配置，请检查.env.production文件');
        process.exit(1);
    }

    console.log(`📡 CDN URL: ${cdnUrl}`);

    const isAccessible = await testCdnUrl(cdnUrl);
    if (!isAccessible) {
        console.error('\n❌ CDN URL无法访问，请检查配置或网络连接');
        process.exit(1);
    }

    await testCommonPaths(cdnUrl);

    console.log('\n✨ 测试完成');
}

main().catch(console.error);