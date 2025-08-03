#!/usr/bin/env node

/**
 * CDN配置测试脚本
 * 
 * 这个脚本用于测试CDN配置是否正确，包括：
 * 1. 检查CDN域名是否可以访问
 * 2. 检查字体文件是否可以正常加载
 * 3. 检查CORS头是否正确设置
 * 4. 检查缓存控制头是否正确设置
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// 配置
const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.dongboge.cn';
const TEST_PATHS = [
    '/fonts/atkinson-regular.woff',
    '/fonts/atkinson-bold.woff',
    '/assets/index.css',
    '/images/hero1.png'
];

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

/**
 * 发送HTTP请求并检查响应
 * @param {string} url - 要请求的URL
 * @returns {Promise<Object>} - 包含响应状态码、头信息等的对象
 */
async function checkUrl(url) {
    return new Promise((resolve, reject) => {
        console.log(`${colors.blue}正在检查: ${url}${colors.reset}`);

        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    url,
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data.length > 100 ? `${data.substring(0, 100)}...` : data
                });
            });
        });

        req.on('error', (error) => {
            reject({
                url,
                error: error.message
            });
        });

        // 设置超时
        req.setTimeout(5000, () => {
            req.abort();
            reject({
                url,
                error: '请求超时'
            });
        });
    });
}

/**
 * 检查CORS头是否正确设置
 * @param {Object} headers - 响应头
 * @returns {boolean} - 是否正确设置了CORS头
 */
function checkCorsHeaders(headers) {
    return headers['access-control-allow-origin'] === '*' ||
        headers['access-control-allow-origin'] === 'https://www.dongboge.cn';
}

/**
 * 检查缓存控制头是否正确设置
 * @param {Object} headers - 响应头
 * @returns {boolean} - 是否正确设置了缓存控制头
 */
function checkCacheHeaders(headers) {
    return headers['cache-control'] &&
        (headers['cache-control'].includes('max-age') ||
            headers['cache-control'].includes('public'));
}

/**
 * 主函数
 */
async function main() {
    console.log(`${colors.cyan}===== CDN配置测试 =====${colors.reset}`);
    console.log(`${colors.cyan}CDN域名: ${CDN_DOMAIN}${colors.reset}`);

    let allPassed = true;
    const results = [];

    // 测试CDN域名是否可以访问
    try {
        const rootResult = await checkUrl(`https://${CDN_DOMAIN}/`);
        console.log(`${colors.green}✓ CDN域名可以访问 (状态码: ${rootResult.statusCode})${colors.reset}`);
        results.push(rootResult);
    } catch (error) {
        console.log(`${colors.red}✗ CDN域名无法访问: ${error.error}${colors.reset}`);
        allPassed = false;
    }

    // 测试各个路径
    for (const path of TEST_PATHS) {
        try {
            const result = await checkUrl(`https://${CDN_DOMAIN}${path}`);

            if (result.statusCode === 200) {
                console.log(`${colors.green}✓ ${path} 可以访问${colors.reset}`);

                // 检查CORS头
                if (path.includes('.woff')) {
                    if (checkCorsHeaders(result.headers)) {
                        console.log(`  ${colors.green}✓ CORS头正确设置${colors.reset}`);
                    } else {
                        console.log(`  ${colors.red}✗ CORS头未正确设置${colors.reset}`);
                        allPassed = false;
                    }
                }

                // 检查缓存控制头
                if (checkCacheHeaders(result.headers)) {
                    console.log(`  ${colors.green}✓ 缓存控制头正确设置: ${result.headers['cache-control']}${colors.reset}`);
                } else {
                    console.log(`  ${colors.yellow}! 缓存控制头未设置或不完整${colors.reset}`);
                }
            } else {
                console.log(`${colors.red}✗ ${path} 无法访问 (状态码: ${result.statusCode})${colors.reset}`);
                allPassed = false;
            }

            results.push(result);
        } catch (error) {
            console.log(`${colors.red}✗ ${path} 请求失败: ${error.error}${colors.reset}`);
            allPassed = false;
        }
    }

    // 总结
    console.log(`\n${colors.cyan}===== 测试结果 =====${colors.reset}`);
    if (allPassed) {
        console.log(`${colors.green}所有测试通过！CDN配置正确。${colors.reset}`);
    } else {
        console.log(`${colors.red}部分测试失败。请检查上述错误信息。${colors.reset}`);
    }

    // 详细信息
    console.log(`\n${colors.cyan}===== 详细信息 =====${colors.reset}`);
    results.forEach(result => {
        console.log(`\n${colors.blue}URL: ${result.url}${colors.reset}`);
        console.log(`状态码: ${result.statusCode}`);
        console.log('响应头:');
        Object.entries(result.headers).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    });
}

// 执行主函数
main().catch(error => {
    console.error(`${colors.red}执行测试时发生错误:${colors.reset}`, error);
    process.exit(1);
});