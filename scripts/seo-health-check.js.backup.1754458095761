// SEO健康检查脚本 - 检查网站的SEO配置是否正确
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://dongboge.com';

class SEOHealthChecker {
    constructor() {
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
    }

    log(type, message, details = '') {
        const timestamp = new Date().toLocaleString();
        const logEntry = {
            timestamp,
            message,
            details
        };

        this.results[type].push(logEntry);

        const icons = {
            passed: '✅',
            failed: '❌',
            warnings: '⚠️'
        };
        console.log(`${icons[type]} ${message}`);
        if (details) console.log(`   ${details}`);
    }

    async checkFile(filePath, description) {
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.log('passed', `${description} 存在`, `文件大小: ${content.length} 字符`);
                return content;
            } else {
                this.log('failed', `${description} 不存在`, `路径: ${filePath}`);
                return null;
            }
        } catch (error) {
            this.log('failed', `检查 ${description} 时出错`, error.message);
            return null;
        }
    }

    async checkURL(url, description) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SEOHealthChecker/1.0)'
                }
            });

            if (response.ok) {
                this.log('passed', `${description} 可访问`, `状态码: ${response.status}`);
                return true;
            } else {
                this.log('failed', `${description} 访问失败`, `状态码: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.log('failed', `检查 ${description} 时出错`, error.message);
            return false;
        }
    }

    checkRobotsTxt(content) {
        if (!content) return;

        const checks = [{
                pattern: /Sitemap:/i,
                name: 'Sitemap声明'
            },
            {
                pattern: /User-agent:/i,
                name: 'User-agent指令'
            },
            {
                pattern: /Allow:/i,
                name: 'Allow指令'
            },
            {
                pattern: /Disallow:/i,
                name: 'Disallow指令'
            }
        ];

        checks.forEach(check => {
            if (check.pattern.test(content)) {
                this.log('passed', `robots.txt包含${check.name}`);
            } else {
                this.log('warnings', `robots.txt缺少${check.name}`);
            }
        });

        // 检查是否包含主要搜索引擎
        const searchEngines = ['Baiduspider', 'Googlebot', 'Sogou', '360Spider'];
        searchEngines.forEach(engine => {
            if (content.includes(engine)) {
                this.log('passed', `robots.txt包含${engine}配置`);
            } else {
                this.log('warnings', `robots.txt缺少${engine}配置`);
            }
        });
    }

    checkSitemap(content) {
        if (!content) return;

        const checks = [{
                pattern: /<urlset/i,
                name: 'URL集合标签'
            },
            {
                pattern: /<url>/i,
                name: 'URL条目'
            },
            {
                pattern: /<loc>/i,
                name: '位置标签'
            },
            {
                pattern: /<lastmod>/i,
                name: '最后修改时间'
            },
            {
                pattern: /<changefreq>/i,
                name: '更新频率'
            },
            {
                pattern: /<priority>/i,
                name: '优先级'
            }
        ];

        checks.forEach(check => {
            if (check.pattern.test(content)) {
                this.log('passed', `sitemap.xml包含${check.name}`);
            } else {
                this.log('warnings', `sitemap.xml缺少${check.name}`);
            }
        });

        // 统计URL数量
        const urlCount = (content.match(/<url>/g) || []).length;
        if (urlCount > 0) {
            this.log('passed', `sitemap.xml包含${urlCount}个URL`);
        } else {
            this.log('failed', 'sitemap.xml没有包含任何URL');
        }

        // 检查是否包含图片信息
        if (content.includes('image:image')) {
            this.log('passed', 'sitemap.xml包含图片信息');
        } else {
            this.log('warnings', 'sitemap.xml缺少图片信息');
        }
    }

    async checkAstroConfig() {
        const configPath = 'astro.config.mjs';
        const content = await this.checkFile(configPath, 'Astro配置文件');

        if (content) {
            if (content.includes('sitemap()')) {
                this.log('passed', 'Astro配置包含sitemap插件');
            } else {
                this.log('failed', 'Astro配置缺少sitemap插件');
            }

            if (content.includes("site: 'https://dongboge.com'")) {
                this.log('passed', 'Astro配置包含正确的网站URL');
            } else {
                this.log('warnings', 'Astro配置的网站URL可能不正确');
            }
        }
    }

    async checkPackageJson() {
        const packagePath = 'package.json';
        const content = await this.checkFile(packagePath, 'package.json');

        if (content) {
            try {
                const pkg = JSON.parse(content);
                const seoPackages = [
                    '@astrojs/sitemap',
                    '@astrojs/rss'
                ];

                seoPackages.forEach(packageName => {
                    if ((pkg.dependencies && pkg.dependencies[packageName]) || (pkg.devDependencies && pkg.devDependencies[packageName])) {
                        this.log('passed', `已安装SEO包: ${packageName}`);
                    } else {
                        this.log('warnings', `未安装SEO包: ${packageName}`);
                    }
                });
            } catch (error) {
                this.log('failed', 'package.json格式错误', error.message);
            }
        }
    }

    async checkImportantPages() {
        const pages = [{
                url: `${SITE_URL}/`,
                name: '首页'
            },
            {
                url: `${SITE_URL}/about/`,
                name: '关于页面'
            },
            {
                url: `${SITE_URL}/services/`,
                name: '服务页面'
            },
            {
                url: `${SITE_URL}/contact/`,
                name: '联系页面'
            },
            {
                url: `${SITE_URL}/blog/`,
                name: '博客页面'
            },
            {
                url: `${SITE_URL}/sitemap.xml`,
                name: 'Sitemap'
            },
            {
                url: `${SITE_URL}/sitemap-index.xml`,
                name: 'Sitemap索引'
            },
            {
                url: `${SITE_URL}/robots.txt`,
                name: 'Robots.txt'
            },
            {
                url: `${SITE_URL}/rss.xml`,
                name: 'RSS订阅'
            }
        ];

        console.log('\n🌐 检查重要页面可访问性...');
        for (const page of pages) {
            await this.checkURL(page.url, page.name);
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.passed.length + this.results.failed.length + this.results.warnings.length,
                passed: this.results.passed.length,
                failed: this.results.failed.length,
                warnings: this.results.warnings.length
            },
            details: this.results
        };

        // 保存报告到文件
        const reportPath = `seo-health-report-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        return report;
    }

    printSummary(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SEO健康检查报告摘要');
        console.log('='.repeat(60));
        console.log(`✅ 通过: ${report.summary.passed}`);
        console.log(`❌ 失败: ${report.summary.failed}`);
        console.log(`⚠️  警告: ${report.summary.warnings}`);
        console.log(`📋 总计: ${report.summary.total}`);

        const score = Math.round((report.summary.passed / report.summary.total) * 100);
        console.log(`🎯 SEO健康评分: ${score}%`);

        if (report.summary.failed > 0) {
            console.log('\n❌ 需要立即修复的问题:');
            report.details.failed.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.message}`);
                if (item.details) console.log(`      ${item.details}`);
            });
        }

        if (report.summary.warnings > 0) {
            console.log('\n⚠️  建议优化的项目:');
            report.details.warnings.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.message}`);
                if (item.details) console.log(`      ${item.details}`);
            });
        }

        console.log(`\n📄 详细报告已保存到: seo-health-report-${new Date().toISOString().split('T')[0]}.json`);
    }

    async runFullCheck() {
        console.log('🔍 开始SEO健康检查...\n');

        // 检查本地文件
        console.log('📁 检查本地SEO文件...');
        const robotsContent = await this.checkFile('public/robots.txt', 'robots.txt');
        const sitemapContent = await this.checkFile('public/sitemap.xml', 'sitemap.xml');

        // 分析文件内容
        if (robotsContent) {
            console.log('\n🤖 分析robots.txt...');
            this.checkRobotsTxt(robotsContent);
        }

        if (sitemapContent) {
            console.log('\n🗺️  分析sitemap.xml...');
            this.checkSitemap(sitemapContent);
        }

        // 检查配置文件
        console.log('\n⚙️  检查配置文件...');
        await this.checkAstroConfig();
        await this.checkPackageJson();

        // 检查在线页面
        await this.checkImportantPages();

        // 生成报告
        const report = this.generateReport();
        this.printSummary(report);

        return report;
    }
}

// 如果直接运行此脚本
if (
    import.meta.url === `file://${process.argv[1]}`) {
    const checker = new SEOHealthChecker();
    checker.runFullCheck().catch(console.error);
}

export {
    SEOHealthChecker
};