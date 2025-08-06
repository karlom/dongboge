#!/usr/bin/env node

/**
 * 测试博客文章 URL 是否可访问
 * 验证 sitemap.xml 修复后的 URL 是否正确
 */

const https = require('https');
const fs = require('fs');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
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
                success: response.statusCode === 200,
                redirect: response.statusCode >= 300 && response.statusCode < 400
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

// 从sitemap.xml中提取博客URL
function extractBlogUrlsFromSitemap() {
    const sitemapPath = 'public/sitemap.xml';

    if (!fs.existsSync(sitemapPath)) {
        log('red', '❌ sitemap.xml 文件不存在');
        return [];
    }

    const content = fs.readFileSync(sitemapPath, 'utf8');
    const urlRegex = /<loc>(https:\/\/dongboge\.com\/blog\/[^<]+)<\/loc>/g;
    const urls = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
        urls.push(match[1]);
    }

    return urls;
}

// 从测试报告中获取URL映射
function getUrlMappingFromReport() {
    const reportFiles = fs.readdirSync('.').filter(f => f.startsWith('sitemap-fix-report-'));

    if (reportFiles.length === 0) {
        return null;
    }

    // 使用最新的报告文件
    const latestReport = reportFiles.sort().pop();
    const reportContent = fs.readFileSync(latestReport, 'utf8');
    const report = JSON.parse(reportContent);

    return report.fixes;
}

async function main() {
    log('blue', '🧪 开始测试博客文章 URL...\n');

    // 1. 从sitemap.xml提取URL
    log('yellow', '📄 从 sitemap.xml 提取博客 URL...');
    const blogUrls = extractBlogUrlsFromSitemap();

    if (blogUrls.length === 0) {
        log('red', '❌ 没有找到博客 URL');
        return;
    }

    log('green', `✅ 找到 ${blogUrls.length} 个博客 URL`);

    // 2. 获取修复映射（用于对比）
    const urlMapping = getUrlMappingFromReport();

    // 3. 测试前几个URL（避免过多请求）
    const testUrls = blogUrls.slice(0, 10);
    log('blue', `\n🔍 测试前 ${testUrls.length} 个 URL...\n`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let redirectCount = 0;

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        log('blue', `[${i + 1}/${testUrls.length}] 测试: ${url}`);

        const result = await checkUrl(url);
        results.push(result);

        if (result.success) {
            log('green', `  ✅ 200 OK`);
            successCount++;
        } else if (result.redirect) {
            log('yellow', `  🔄 ${result.status} 重定向`);
            redirectCount++;
        } else {
            log('red', `  ❌ ${result.status} ${result.error || ''}`);
            errorCount++;
        }

        // 添加延迟避免请求过快
        if (i < testUrls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // 4. 显示测试结果
    log('blue', '\n📊 测试结果统计:');
    log('green', `  ✅ 成功: ${successCount}`);
    log('yellow', `  🔄 重定向: ${redirectCount}`);
    log('red', `  ❌ 失败: ${errorCount}`);
    log('blue', `  📊 总计: ${testUrls.length}`);

    // 5. 显示修复对比（如果有报告）
    if (urlMapping) {
        log('blue', '\n🔄 修复前后对比示例:');
        const sampleFixes = urlMapping.slice(0, 3);

        sampleFixes.forEach(fix => {
            log('blue', `  📝 ${fix.fileName}:`);
            log('red', `    旧: ${fix.oldUrl}`);
            log('green', `    新: ${fix.newUrl}`);
        });
    }

    // 6. 生成建议
    log('blue', '\n📋 建议:');

    if (successCount === testUrls.length) {
        log('green', '🎉 所有测试的 URL 都可以正常访问！');
        log('blue', '  1. 立即部署修复后的 sitemap.xml 到服务器');
        log('blue', '  2. 在 Google Search Console 中重新提交 sitemap');
        log('blue', '  3. 等待搜索引擎重新抓取（通常1-3天）');
    } else if (successCount > testUrls.length * 0.8) {
        log('yellow', '⚠️ 大部分 URL 可以访问，但有少数问题');
        log('blue', '  1. 检查失败的 URL 是否存在对应的页面');
        log('blue', '  2. 确认 slug 配置是否正确');
        log('blue', '  3. 部署修复后的 sitemap.xml');
    } else {
        log('red', '❌ 多个 URL 无法访问，需要进一步检查');
        log('blue', '  1. 确认网站路由配置是否正确');
        log('blue', '  2. 检查 Astro 的动态路由设置');
        log('blue', '  3. 验证博客文章的 slug 配置');
    }

    // 7. 保存测试结果
    const testReport = {
        timestamp: new Date().toISOString(),
        totalTested: testUrls.length,
        results: {
            success: successCount,
            redirect: redirectCount,
            error: errorCount
        },
        details: results,
        recommendations: successCount === testUrls.length ? 'deploy' : 'investigate'
    };

    const reportFile = `blog-url-test-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(testReport, null, 2));

    log('green', `\n📋 测试报告已保存: ${reportFile}`);

    // 8. 显示下一步操作
    if (successCount === testUrls.length) {
        log('blue', '\n🚀 下一步操作:');
        log('blue', '  1. 运行部署脚本: ./deploy-seo-files.sh');
        log('blue', '  2. 验证在线 sitemap: curl https://dongboge.cn/sitemap.xml');
        log('blue', '  3. 重新提交到搜索引擎');
    }

    log('blue', '\n🔍 博客 URL 测试完成！');
}

main().catch(console.error);