#!/usr/bin/env node

/**
 * robots.txt 验证脚本
 * 检查 robots.txt 文件是否符合各大搜索引擎的规范
 */

const fs = require('fs');
const https = require('https');

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

// 检查 robots.txt 内容
function validateRobotsContent(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const issues = [];
    const warnings = [];
    const info = [];

    let currentUserAgent = null;
    let hasGlobalUserAgent = false;
    let hasSitemap = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 跳过注释
        if (line.startsWith('#')) continue;

        // 检查 User-agent
        if (line.toLowerCase().startsWith('user-agent:')) {
            currentUserAgent = line.split(':')[1].trim();
            if (currentUserAgent === '*') {
                hasGlobalUserAgent = true;
            }
            continue;
        }

        // 检查 Sitemap
        if (line.toLowerCase().startsWith('sitemap:')) {
            hasSitemap = true;
            const sitemapUrl = line.split(':', 2)[1].trim();
            if (!sitemapUrl.startsWith('http')) {
                issues.push(`第${lineNum}行: Sitemap URL 必须是完整的 HTTP/HTTPS URL`);
            }
            continue;
        }

        // 检查 Crawl-delay
        if (line.toLowerCase().startsWith('crawl-delay:')) {
            if (currentUserAgent === 'Googlebot' || currentUserAgent === 'googlebot') {
                issues.push(`第${lineNum}行: Google 不支持 Crawl-delay 指令，会被忽略`);
            } else if (currentUserAgent === '*') {
                warnings.push(`第${lineNum}行: 全局 Crawl-delay 可能影响所有搜索引擎的抓取速度`);
            }
            continue;
        }

        // 检查 Allow/Disallow
        if (line.toLowerCase().startsWith('allow:') || line.toLowerCase().startsWith('disallow:')) {
            if (!currentUserAgent) {
                issues.push(`第${lineNum}行: Allow/Disallow 指令必须在 User-agent 指令之后`);
            }
            continue;
        }
    }

    // 基本检查
    if (!hasGlobalUserAgent) {
        warnings.push('建议添加 "User-agent: *" 作为默认规则');
    }

    if (!hasSitemap) {
        warnings.push('建议添加 Sitemap 指令指向你的网站地图');
    }

    return {
        issues,
        warnings,
        info
    };
}

// 测试在线访问
function testOnlineAccess(url) {
    return new Promise((resolve) => {
        const request = https.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    content: data,
                    success: response.statusCode === 200
                });
            });
        });

        request.on('error', (error) => {
            resolve({
                status: 'ERROR',
                error: error.message,
                success: false
            });
        });

        request.setTimeout(10000, () => {
            request.destroy();
            resolve({
                status: 'TIMEOUT',
                error: 'Request timeout',
                success: false
            });
        });
    });
}

async function main() {
    log('blue', '🤖 开始验证 robots.txt...\n');

    // 检查本地文件
    log('yellow', '📁 检查本地 robots.txt 文件...');

    if (!fs.existsSync('public/robots.txt')) {
        log('red', '❌ public/robots.txt 文件不存在');
        return;
    }

    const content = fs.readFileSync('public/robots.txt', 'utf8');
    const stats = fs.statSync('public/robots.txt');

    log('green', `✅ 文件存在 - ${stats.size} 字节`);
    log('blue', `📄 最后修改: ${stats.mtime.toLocaleString()}`);

    console.log();

    // 验证内容
    log('yellow', '🔍 验证 robots.txt 内容...');

    const validation = validateRobotsContent(content);

    // 显示问题
    if (validation.issues.length > 0) {
        log('red', '❌ 发现问题:');
        validation.issues.forEach(issue => {
            log('red', `  • ${issue}`);
        });
        console.log();
    }

    // 显示警告
    if (validation.warnings.length > 0) {
        log('yellow', '⚠️ 警告:');
        validation.warnings.forEach(warning => {
            log('yellow', `  • ${warning}`);
        });
        console.log();
    }

    // 显示信息
    if (validation.info.length > 0) {
        log('blue', 'ℹ️ 信息:');
        validation.info.forEach(info => {
            log('blue', `  • ${info}`);
        });
        console.log();
    }

    if (validation.issues.length === 0) {
        log('green', '✅ robots.txt 内容验证通过');
    }

    console.log();

    // 测试在线访问
    log('yellow', '🌐 测试在线访问...');

    const result = await testOnlineAccess('https://dongboge.cn/robots.txt');

    if (result.success) {
        log('green', `✅ 在线访问正常 - HTTP ${result.status}`);

        // 检查 Content-Type
        const contentType = result.headers['content-type'];
        if (contentType && contentType.includes('text/plain')) {
            log('green', '✅ Content-Type 正确: text/plain');
        } else {
            log('yellow', `⚠️ Content-Type: ${contentType || '未设置'}`);
        }

        // 比较内容
        if (result.content.trim() === content.trim()) {
            log('green', '✅ 在线内容与本地文件一致');
        } else {
            log('yellow', '⚠️ 在线内容与本地文件不一致，可能需要重新部署');
        }

    } else {
        log('red', `❌ 在线访问失败 - ${result.status} ${result.error || ''}`);
    }

    console.log();

    // 显示内容预览
    log('blue', '📄 robots.txt 内容预览:');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const lineNum = (index + 1).toString().padStart(2, ' ');
        if (line.trim().startsWith('#')) {
            log('blue', `  ${lineNum}: ${line}`);
        } else if (line.trim()) {
            log('green', `  ${lineNum}: ${line}`);
        } else {
            console.log(`  ${lineNum}: `);
        }
    });

    console.log();

    // 搜索引擎兼容性检查
    log('yellow', '🔍 搜索引擎兼容性检查...');

    const userAgents = content.match(/User-agent:\s*(.+)/gi) || [];
    const crawlDelays = content.match(/Crawl-delay:\s*(.+)/gi) || [];

    log('blue', `  检测到 ${userAgents.length} 个 User-agent 规则`);
    log('blue', `  检测到 ${crawlDelays.length} 个 Crawl-delay 规则`);

    // Google 特殊检查
    const hasGooglebot = content.toLowerCase().includes('googlebot');
    const hasGooglebotCrawlDelay = /user-agent:\s*googlebot[\s\S]*?crawl-delay:/i.test(content);

    if (hasGooglebotCrawlDelay) {
        log('red', '❌ Google 不支持针对 Googlebot 的 Crawl-delay 指令');
        log('blue', '💡 建议: 移除 Googlebot 的 Crawl-delay 规则');
    } else if (hasGooglebot) {
        log('green', '✅ Googlebot 配置正确');
    }

    console.log();

    // 总结
    const totalIssues = validation.issues.length;
    const totalWarnings = validation.warnings.length;

    if (totalIssues === 0 && totalWarnings === 0) {
        log('green', '🎉 robots.txt 完全符合规范！');
    } else if (totalIssues === 0) {
        log('yellow', `⚠️ robots.txt 基本正确，但有 ${totalWarnings} 个建议优化项`);
    } else {
        log('red', `❌ robots.txt 有 ${totalIssues} 个问题需要修复`);
    }

    log('blue', '\n🔍 robots.txt 验证完成！');
}

main().catch(console.error);