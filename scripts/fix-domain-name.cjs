#!/usr/bin/env node

/**
 * 修复域名错误：dongboge.cn → dongboge.cn
 * 批量替换所有相关文件中的域名
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

// 需要检查和修复的文件列表
const filesToCheck = [
    'public/sitemap.xml',
    'public/sitemap-index.xml',
    'public/robots.txt',
    'public/rss.xml',
    'astro.config.mjs',
    'src/pages/rss.xml.js',
    'scripts/fix-sitemap-urls.cjs',
    'scripts/test-blog-urls.cjs',
    'scripts/seo-health-check.cjs',
    'scripts/validate-robots.cjs',
    'deploy-seo-files.sh',
    'diagnose-seo-files.sh',
    'verify-robots-fix.sh',
    'fix-seo-files-access.sh',
    'SEO-SUBMISSION-GUIDE.md',
    'SITEMAP-URL-FIX-SUMMARY.md',
    'ROBOTS-FIX-DEPLOYMENT.md',
    'SEO-FILES-FIXED.md'
];

// 替换文件中的域名
function fixDomainInFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log('yellow', `  ⚠️ 文件不存在: ${filePath}`);
        return {
            fixed: false,
            reason: 'file not found'
        };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // 替换所有的 dongboge.cn 为 dongboge.cn
    const fixedContent = content.replace(/dongboge\.com/g, 'dongboge.cn');

    if (originalContent === fixedContent) {
        return {
            fixed: false,
            reason: 'no changes needed'
        };
    }

    // 备份原文件
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, originalContent);

    // 写入修复后的内容
    fs.writeFileSync(filePath, fixedContent);

    // 统计替换次数
    const matches = originalContent.match(/dongboge\.com/g);
    const replaceCount = matches ? matches.length : 0;

    return {
        fixed: true,
        replaceCount,
        backupPath,
        reason: 'domain fixed'
    };
}

// 扫描目录中的其他可能包含域名的文件
function scanDirectory(dir, extensions = ['.md', '.js', '.cjs', '.mjs', '.json', '.xml', '.txt']) {
    const foundFiles = [];

    if (!fs.existsSync(dir)) {
        return foundFiles;
    }

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // 跳过某些目录
            if (['node_modules', '.git', 'dist', '.astro'].includes(file)) {
                continue;
            }
            foundFiles.push(...scanDirectory(filePath, extensions));
        } else if (stat.isFile()) {
            const ext = path.extname(file);
            if (extensions.includes(ext)) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('dongboge.cn')) {
                    foundFiles.push(filePath);
                }
            }
        }
    }

    return foundFiles;
}

async function main() {
    log('blue', '🔧 开始修复域名错误: dongboge.cn → dongboge.cn\n');

    const results = [];
    let totalFixed = 0;
    let totalReplaces = 0;

    // 1. 修复预定义的文件列表
    log('yellow', '📁 修复预定义文件...');

    for (const filePath of filesToCheck) {
        log('blue', `检查: ${filePath}`);
        const result = fixDomainInFile(filePath);
        result.filePath = filePath;
        results.push(result);

        if (result.fixed) {
            log('green', `  ✅ 已修复 ${result.replaceCount} 处域名`);
            log('blue', `  💾 备份: ${result.backupPath}`);
            totalFixed++;
            totalReplaces += result.replaceCount;
        } else {
            if (result.reason === 'file not found') {
                log('yellow', `  ⚠️ 文件不存在`);
            } else {
                log('green', `  ✅ 无需修复`);
            }
        }
    }

    // 2. 扫描其他可能的文件
    log('yellow', '\n🔍 扫描其他可能包含域名的文件...');

    const additionalFiles = [
        ...scanDirectory('.', ['.md', '.js', '.cjs', '.mjs']),
        ...scanDirectory('src', ['.js', '.ts', '.astro', '.md']),
        ...scanDirectory('deploy', ['.sh', '.conf'])
    ];

    // 去重并排除已处理的文件
    const uniqueFiles = [...new Set(additionalFiles)].filter(f => !filesToCheck.includes(f));

    if (uniqueFiles.length > 0) {
        log('blue', `发现 ${uniqueFiles.length} 个额外文件包含域名:`);

        for (const filePath of uniqueFiles) {
            log('blue', `检查: ${filePath}`);
            const result = fixDomainInFile(filePath);
            result.filePath = filePath;
            results.push(result);

            if (result.fixed) {
                log('green', `  ✅ 已修复 ${result.replaceCount} 处域名`);
                totalFixed++;
                totalReplaces += result.replaceCount;
            }
        }
    } else {
        log('green', '✅ 没有发现其他包含域名的文件');
    }

    // 3. 显示修复总结
    log('blue', '\n📊 修复总结:');
    log('green', `  ✅ 修复文件数: ${totalFixed}`);
    log('green', `  🔄 替换次数: ${totalReplaces}`);
    log('blue', `  📁 检查文件数: ${results.length}`);

    // 4. 显示修复详情
    const fixedFiles = results.filter(r => r.fixed);
    if (fixedFiles.length > 0) {
        log('blue', '\n📋 修复详情:');
        fixedFiles.forEach(result => {
            log('green', `  • ${result.filePath} - ${result.replaceCount} 处替换`);
        });
    }

    // 5. 生成修复报告
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalFiles: results.length,
            fixedFiles: totalFixed,
            totalReplaces: totalReplaces
        },
        details: results,
        fixedFiles: fixedFiles.map(r => ({
            file: r.filePath,
            replaces: r.replaceCount,
            backup: r.backupPath
        }))
    };

    const reportFile = `domain-fix-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    log('green', `\n📋 修复报告已保存: ${reportFile}`);

    // 6. 验证修复结果
    log('yellow', '\n🔍 验证修复结果...');

    let remainingIssues = 0;
    for (const result of results) {
        if (fs.existsSync(result.filePath)) {
            const content = fs.readFileSync(result.filePath, 'utf8');
            if (content.includes('dongboge.cn')) {
                log('red', `  ❌ ${result.filePath} 仍包含 dongboge.cn`);
                remainingIssues++;
            }
        }
    }

    if (remainingIssues === 0) {
        log('green', '✅ 所有文件都已正确修复！');
    } else {
        log('red', `❌ 还有 ${remainingIssues} 个文件需要手动检查`);
    }

    // 7. 下一步建议
    log('blue', '\n📋 下一步建议:');

    if (totalFixed > 0) {
        log('blue', '  1. 验证关键文件内容是否正确');
        log('blue', '  2. 测试网站功能是否正常');
        log('blue', '  3. 重新部署 SEO 文件到服务器');
        log('blue', '  4. 在搜索引擎中重新提交 sitemap');

        log('yellow', '\n🧪 建议运行的测试:');
        log('blue', '  • node scripts/seo-health-check.cjs');
        log('blue', '  • node scripts/test-blog-urls.cjs');
        log('blue', '  • ./diagnose-seo-files.sh');
    } else {
        log('green', '  ✅ 所有文件都使用正确的域名，无需进一步操作');
    }

    log('blue', '\n🎉 域名修复完成！');
}

main().catch(console.error);