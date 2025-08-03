// 测试CDN配置是否正确
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CDN域名从环境变量获取
const cdnDomain = process.env.CDN_DOMAIN || 'cdn.dongboge.cn';

// 测试URL列表
const testUrls = [
    `https://${cdnDomain}/fonts/atkinson-regular.woff`,
    `https://${cdnDomain}/fonts/atkinson-bold.woff`,
    `https://${cdnDomain}/assets/blog-placeholder-1.jpg`,
    `https://${cdnDomain}/images/hero1.png`
];

// 测试单个URL
async function testUrl(url) {
    console.log(`测试URL: ${url}`);
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'Origin': 'https://www.dongboge.cn'
            }
        });

        console.log(`状态码: ${response.status}`);
        console.log('响应头:');
        response.headers.forEach((value, name) => {
            console.log(`  ${name}: ${value}`);
        });

        // 检查CORS头
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (corsHeader) {
            console.log(`✅ CORS配置正确: ${corsHeader}`);
        } else {
            console.log('❌ 未找到CORS头');
        }

        // 检查缓存控制头
        const cacheHeader = response.headers.get('cache-control');
        if (cacheHeader) {
            console.log(`✅ 缓存控制配置: ${cacheHeader}`);
        } else {
            console.log('⚠️ 未找到缓存控制头');
        }

        console.log('-----------------------------------');
        return response.status >= 200 && response.status < 300;
    } catch (error) {
        console.error(`❌ 测试失败: ${error.message}`);
        console.log('-----------------------------------');
        return false;
    }
}

// 主函数
async function main() {
    console.log(`开始测试CDN配置 (${cdnDomain})...`);
    console.log('===================================');

    let successCount = 0;
    for (const url of testUrls) {
        const success = await testUrl(url);
        if (success) successCount++;
    }

    console.log('===================================');
    console.log(`测试结果: ${successCount}/${testUrls.length} 通过`);

    if (successCount === testUrls.length) {
        console.log('✅ 所有测试通过!');
        process.exit(0);
    } else {
        console.log('❌ 部分测试失败，请检查上述输出');
        process.exit(1);
    }
}

// 执行主函数
main();