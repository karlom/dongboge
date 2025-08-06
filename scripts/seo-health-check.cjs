#!/usr/bin/env node

/**
 * SEO健康检查脚本
 * 检查网站的SEO配置状态
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查URL的HTTP状态
function checkUrl(url) {
    return new Promise((resolve) => {
        const request = https.get(url, (response) => {
            resolve({
                url,
                status: response.statusCode,
                headers: response.headers,
                success: response.statusCode === 200
            });
        });

        request.on('error', (error) => {
            resolve({
                url,
                status: 'ERROR',
                error: error.message,
                success: false
            });
        });

        request.setTimeout(10000, () => {
            request.destroy();
            resolve({
                url,
                status: 'TIMEOUT',
                error: 'Request timeout',
                success: false
            });
        });
    });
}

// 检查本地文件
function checkLocalFile(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            exists: true,
            size: stats.size,
            content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            lastModified: stats.mtime
        };
    } catch (error) {
        return {
            exists: false,
            error: error.message
        };
    }
}

async function main() {
    log('blue', '🔍 开始SEO健康检查...\n');

    // 检查本地文件
    log('yellow', '📁 检查本地SEO文件...');

    const localFiles = [
        'public/robots.txt',
        'public/sitemap.xml',
        'public/sitemap-index.xml',
        'public/rss.xml'
    ];

    const localResults = {};

    for (const file of localFiles) {
        const result = checkLocalFile(file);
        localResults[file] = result;

        if (result.exists) {
            log('green', `✅ ${file} - ${result.size} 字节`);
        } else {
            log('red', `❌ ${file} - 不存在`);
        }
    }

    console.log();

    // 检查在线访问
    log('yellow', '🌐 检查在线访问状态...');

    const urls = [
        'https://dongboge.cn/',
        'https://dongboge.cn/robots.txt',
        'https://dongboge.cn/sitemap.xml',
        'https://dongboge.cn/sitemap-index.xml',
        'https://dongboge.cn/rss.xml',
        'https://dongboge.cn/about/',
        'https://dongboge.cn/services/',
        'https://dongboge.cn/contact/',
        'https://dongboge.cn/blog/'
    ];

    const onlineResults = {};

    for (const url of urls) {
        const result = await checkUrl(url);
        onlineResults[url] = result;

        if (result.success) {
            log('green', `✅ ${url} - ${result.status}`);
        } else {
            log('red', `❌ ${url} - ${result.status} ${result.error || ''}`);
        }
    }

    console.log();

    // 生成报告
    log('blue', '📊 生成健康检查报告...');

    const report = {
        timestamp: new Date().toISOString(),
        localFiles: localResults,
        onlineAccess: onlineResults,
        summary: {
            localFilesCount: Object.keys(localResults).length,
            localFilesSuccess: Object.values(localResults).filter(r => r.exists).length,
            onlineUrlsCount: Object.keys(onlineResults).length,
            onlineUrlsSuccess: Object.values(onlineResults).filter(r => r.success).length
        }
    };

    // 保存报告
    const reportFile = `seo-health-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    log('green', `✅ 报告已保存到: ${reportFile}`);

    console.log();

    // 显示总结
    log('blue', '📋 检查总结:');
    log('blue', `  本地文件: ${report.summary.localFilesSuccess}/${report.summary.localFilesCount} 通过`);
    log('blue', `  在线访问: ${report.summary.onlineUrlsSuccess}/${report.summary.onlineUrlsCount} 通过`);

    const totalSuccess = report.summary.localFilesSuccess + report.summary.onlineUrlsSuccess;
    const totalCount = report.summary.localFilesCount + report.summary.onlineUrlsCount;

    if (totalSuccess === totalCount) {
        log('green', '🎉 所有检查都通过了！你的SEO配置很健康！');
        log('blue', '\n📋 建议下一步操作:');
        log('blue', '  1. 在Google Search Console中提交sitemap');
        log('blue', '  2. 在百度搜索资源平台中提交sitemap');
        log('blue', '  3. 监控搜索引擎收录情况');
    } else if (totalSuccess >= totalCount * 0.8) {
        log('yellow', '⚠️ 大部分检查通过，但还有一些问题需要修复');
    } else {
        log('red', '❌ 发现多个问题，建议立即修复');
    }

    console.log();

    // 特殊检查：sitemap内容验证
    if (localResults['public/sitemap.xml'] && localResults['public/sitemap.xml'].exists) {
        log('yellow', '🔍 验证sitemap内容...');

        const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
        const urlCount = (sitemapContent.match(/<loc>/g) || []).length;
        const imageCount = (sitemapContent.match(/<image:image>/g) || []).length;

        log('blue', `  包含 ${urlCount} 个URL`);
        log('blue', `  包含 ${imageCount} 个图片`);

        if (urlCount > 0) {
            log('green', '✅ sitemap包含有效内容');
        } else {
            log('red', '❌ sitemap为空或格式错误');
        }
    }

    // 检查robots.txt内容
    if (localResults['public/robots.txt'] && localResults['public/robots.txt'].exists) {
        log('yellow', '🔍 验证robots.txt内容...');

        const robotsContent = fs.readFileSync('public/robots.txt', 'utf8');
        const hasSitemap = robotsContent.includes('Sitemap:');
        const hasUserAgent = robotsContent.includes('User-agent:');

        if (hasSitemap && hasUserAgent) {
            log('green', '✅ robots.txt配置正确');
        } else {
            log('yellow', '⚠️ robots.txt可能需要优化');
        }
    }

    log('blue', '\n🔍 SEO健康检查完成！');
}

main().catch(console.error);