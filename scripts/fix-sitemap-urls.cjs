#!/usr/bin/env node

/**
 * 修复 sitemap.xml 中的博客文章 URL
 * 将文件名替换为正确的 slug
 */

const fs = require('fs');
const path = require('path');

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

// 解析 markdown 文件的 frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) return {};

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // 移除引号
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            frontmatter[key] = value;
        }
    }

    return frontmatter;
}

// 获取所有博客文章的文件名和 slug 映射
function getBlogFileSlugs() {
    const blogDir = 'src/content/blog';
    const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
    const mapping = {};

    log('blue', '📁 扫描博客文章...');

    for (const file of files) {
        const filePath = path.join(blogDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatter = parseFrontmatter(content);

        if (frontmatter.slug) {
            const fileName = path.basename(file, '.md');
            mapping[fileName] = frontmatter.slug;
            log('green', `  ✅ ${fileName} → ${frontmatter.slug}`);
        } else {
            log('yellow', `  ⚠️ ${file} 没有 slug 配置`);
        }
    }

    return mapping;
}

// 修复 sitemap.xml 中的 URL
function fixSitemapUrls(mapping) {
    const sitemapPath = 'public/sitemap.xml';

    if (!fs.existsSync(sitemapPath)) {
        log('red', '❌ sitemap.xml 文件不存在');
        return false;
    }

    log('blue', '📝 读取 sitemap.xml...');
    let content = fs.readFileSync(sitemapPath, 'utf8');

    // 备份原文件
    const backupPath = `${sitemapPath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    log('green', `✅ 已备份到: ${backupPath}`);

    let fixCount = 0;
    const fixes = [];

    // 替换每个文件名为对应的 slug
    for (const [fileName, slug] of Object.entries(mapping)) {
        const oldUrl = `https://dongboge.cn/blog/${fileName}/`;
        const newUrl = `https://dongboge.cn/blog/${slug}/`;

        if (content.includes(oldUrl)) {
            content = content.replace(new RegExp(escapeRegExp(oldUrl), 'g'), newUrl);
            fixes.push({
                fileName,
                slug,
                oldUrl,
                newUrl
            });
            fixCount++;
            log('green', `  ✅ 修复: ${fileName} → ${slug}`);
        }
    }

    if (fixCount > 0) {
        // 写入修复后的内容
        fs.writeFileSync(sitemapPath, content);
        log('green', `🎉 已修复 ${fixCount} 个 URL`);

        // 显示修复详情
        log('blue', '\n📊 修复详情:');
        fixes.forEach(fix => {
            log('blue', `  • ${fix.fileName}`);
            log('yellow', `    旧: ${fix.oldUrl}`);
            log('green', `    新: ${fix.newUrl}`);
        });

        return true;
    } else {
        log('yellow', '⚠️ 没有找到需要修复的 URL');
        return false;
    }
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 验证修复结果
function validateFixes(mapping) {
    const sitemapPath = 'public/sitemap.xml';
    const content = fs.readFileSync(sitemapPath, 'utf8');

    log('blue', '\n🔍 验证修复结果...');

    let validCount = 0;
    let invalidCount = 0;

    for (const [fileName, slug] of Object.entries(mapping)) {
        const correctUrl = `https://dongboge.cn/blog/${slug}/`;
        const incorrectUrl = `https://dongboge.cn/blog/${fileName}/`;

        if (content.includes(correctUrl)) {
            validCount++;
            log('green', `  ✅ ${slug} - URL 正确`);
        } else if (content.includes(incorrectUrl)) {
            invalidCount++;
            log('red', `  ❌ ${fileName} - 仍使用文件名`);
        }
    }

    log('blue', `\n📊 验证结果: ${validCount} 个正确, ${invalidCount} 个错误`);

    return invalidCount === 0;
}

// 生成测试报告
function generateTestReport(mapping) {
    const report = {
        timestamp: new Date().toISOString(),
        totalFiles: Object.keys(mapping).length,
        fixes: [],
        testUrls: []
    };

    for (const [fileName, slug] of Object.entries(mapping)) {
        const testUrl = `https://dongboge.cn/blog/${slug}/`;
        report.testUrls.push(testUrl);
        report.fixes.push({
            fileName,
            slug,
            oldUrl: `https://dongboge.cn/blog/${fileName}/`,
            newUrl: testUrl
        });
    }

    const reportPath = `sitemap-fix-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log('green', `📋 测试报告已生成: ${reportPath}`);

    return report;
}

async function main() {
    log('blue', '🔧 开始修复 sitemap.xml 中的博客 URL...\n');

    try {
        // 1. 获取文件名和 slug 的映射
        const mapping = getBlogFileSlugs();

        if (Object.keys(mapping).length === 0) {
            log('red', '❌ 没有找到任何带有 slug 的博客文章');
            return;
        }

        log('blue', `\n📊 找到 ${Object.keys(mapping).length} 个博客文章`);

        // 2. 修复 sitemap.xml
        const fixed = fixSitemapUrls(mapping);

        if (!fixed) {
            log('yellow', '⚠️ 没有进行任何修复');
            return;
        }

        // 3. 验证修复结果
        const isValid = validateFixes(mapping);

        // 4. 生成测试报告
        const report = generateTestReport(mapping);

        if (isValid) {
            log('green', '\n🎉 sitemap.xml 修复完成！所有 URL 都已更正');
            log('blue', '\n📋 下一步建议:');
            log('blue', '  1. 重新部署 sitemap.xml 到服务器');
            log('blue', '  2. 在 Google Search Console 中重新提交 sitemap');
            log('blue', '  3. 测试几个博客文章 URL 确保可访问');
        } else {
            log('yellow', '\n⚠️ 部分 URL 可能仍有问题，请检查日志');
        }

        // 显示一些测试 URL
        log('blue', '\n🧪 可以测试这些 URL:');
        const testUrls = report.testUrls.slice(0, 5);
        testUrls.forEach(url => {
            log('blue', `  • ${url}`);
        });

    } catch (error) {
        log('red', `❌ 修复过程中出错: ${error.message}`);
        console.error(error);
    }

    log('blue', '\n🔍 sitemap URL 修复完成！');
}

main().catch(console.error);