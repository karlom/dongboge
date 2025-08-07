#!/usr/bin/env node

/**
 * 简化部署脚本 - 只做必要的更新
 * 
 * 功能：
 * 1. 检测博客文章变更
 * 2. 增量构建变化内容
 * 3. 生成最新sitemap
 * 4. 同步到服务器
 * 5. 更新CDN资源
 */

import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';
import {
    detectChanges
} from './modules/change-detector.js';
import {
    generateSitemap
} from './modules/sitemap-generator.js';
import {
    syncToServer
} from './modules/server-sync.js';
import {
    syncToCDN
} from './modules/cdn-sync.js';

// 配置
const config = {
    server: {
        host: process.env.HOST,
        username: process.env.USERNAME,
        deployPath: '/var/www/dongboge/client'
    },
    cdn: {
        bucket: process.env.TENCENT_COS_BUCKET,
        region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
        domain: 'https://cdn.dongboge.cn'
    },
    build: {
        incremental: true,
        skipUnchanged: true,
        generateSitemap: true
    }
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 验证环境变量
function validateEnvironment() {
    const required = ['HOST', 'USERNAME', 'TENCENT_COS_BUCKET'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        log('red', `❌ 缺少必要的环境变量: ${missing.join(', ')}`);
        return false;
    }

    return true;
}

// 增量构建
async function incrementalBuild(changes) {
    log('blue', '🔨 开始增量构建...');

    try {
        // 如果有博客变更，需要重新构建
        if (changes.blog.length > 0) {
            log('yellow', `📝 检测到 ${changes.blog.length} 个博客文章变更`);

            // 运行Astro构建（只构建必要的部分）
            log('blue', '⚡ 运行Astro构建...');
            execSync('npm run build', {
                stdio: 'inherit'
            });

            log('green', '✅ 构建完成');
            return true;
        } else {
            log('cyan', '⏭️ 没有博客变更，跳过构建');
            return false;
        }
    } catch (error) {
        log('red', `❌ 构建失败: ${error.message}`);
        throw error;
    }
}

// 主函数
async function main() {
    const startTime = Date.now();

    log('cyan', '🚀 开始简化部署流程...\n');

    try {
        // 1. 验证环境
        if (!validateEnvironment()) {
            process.exit(1);
        }

        // 2. 检测变更
        log('blue', '🔍 检测文件变更...');
        const changes = await detectChanges();

        if (changes.total === 0) {
            log('green', '✅ 没有检测到变更，部署完成');
            return;
        }

        log('yellow', `📊 变更统计:`);
        log('yellow', `  - 博客文章: ${changes.blog.length}`);
        log('yellow', `  - 静态资源: ${changes.assets.length}`);
        log('yellow', `  - 总计: ${changes.total}`);

        // 3. 增量构建
        const needsBuild = await incrementalBuild(changes);

        // 4. 生成sitemap（如果有博客变更）
        if (changes.blog.length > 0) {
            log('blue', '🗺️ 生成最新sitemap...');
            await generateSitemap();
            log('green', '✅ Sitemap已更新');
        }

        // 5. 同步到服务器（如果有构建）
        if (needsBuild) {
            log('blue', '📤 同步到服务器...');
            await syncToServer(changes);
            log('green', '✅ 服务器同步完成');
        }

        // 6. 同步到CDN（如果有资源变更）
        if (changes.assets.length > 0) {
            log('blue', '☁️ 同步到CDN...');
            await syncToCDN(changes.assets);
            log('green', '✅ CDN同步完成');
        }

        // 7. 部署总结
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);

        log('green', '\n🎉 ===== 部署完成 =====');
        log('cyan', `⏱️ 总耗时: ${duration}秒`);
        log('cyan', `📝 博客更新: ${changes.blog.length} 篇`);
        log('cyan', `🖼️ 资源更新: ${changes.assets.length} 个`);
        log('cyan', `🌐 网站: https://dongboge.cn`);

        if (changes.blog.length > 0) {
            log('blue', '\n📋 更新的博客文章:');
            changes.blog.forEach(post => {
                log('blue', `  • ${post.title} (${post.slug})`);
            });
        }

    } catch (error) {
        log('red', `❌ 部署失败: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// 运行主函数
main().catch(error => {
    log('red', `❌ 执行失败: ${error.message}`);
    process.exit(1);
});