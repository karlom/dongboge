// 检查网站在线状态的脚本
import fetch from 'node-fetch';

const SITE_URL = 'https://dongboge.com';

// 重要页面列表
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

async function checkURL(url, name, timeout = 15000) {
    try {
        console.log(`🔍 检查 ${name}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log(`✅ ${name}: 正常 (${response.status})`);
            return {
                url,
                name,
                status: 'success',
                code: response.status
            };
        } else {
            console.log(`⚠️ ${name}: HTTP错误 (${response.status})`);
            return {
                url,
                name,
                status: 'http_error',
                code: response.status
            };
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(`⏰ ${name}: 超时`);
            return {
                url,
                name,
                status: 'timeout',
                error: '请求超时'
            };
        } else {
            console.log(`❌ ${name}: ${error.message}`);
            return {
                url,
                name,
                status: 'error',
                error: error.message
            };
        }
    }
}

async function checkAllPages() {
    console.log('🌐 开始检查网站在线状态...\n');

    const results = [];

    for (const page of pages) {
        const result = await checkURL(page.url, page.name);
        results.push(result);

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 统计结果
    const summary = {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status !== 'success').length
    };

    console.log('\n' + '='.repeat(50));
    console.log('📊 检查结果汇总');
    console.log('='.repeat(50));
    console.log(`✅ 正常: ${summary.success}/${summary.total}`);
    console.log(`❌ 异常: ${summary.errors}/${summary.total}`);

    if (summary.errors > 0) {
        console.log('\n❌ 需要注意的问题:');
        results.filter(r => r.status !== 'success').forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.name}: ${result.error || result.code}`);
        });
    }

    // 如果网站完全无法访问，提供诊断建议
    if (summary.success === 0) {
        console.log('\n🚨 网站似乎完全无法访问，请检查:');
        console.log('   1. 域名DNS解析是否正常');
        console.log('   2. 服务器是否正在运行');
        console.log('   3. 防火墙设置是否正确');
        console.log('   4. SSL证书是否有效');
        console.log('\n💡 可以尝试的诊断命令:');
        console.log(`   ping dongboge.com`);
        console.log(`   nslookup dongboge.com`);
        console.log(`   curl -I ${SITE_URL}`);
    } else if (summary.success < summary.total) {
        console.log('\n💡 部分页面无法访问，建议:');
        console.log('   1. 检查nginx配置是否正确');
        console.log('   2. 确认所有页面都已部署');
        console.log('   3. 检查路由配置');
    } else {
        console.log('\n🎉 所有页面都可以正常访问！');
        console.log('   现在可以安全地提交sitemap到搜索引擎了。');
    }

    return results;
}

// 如果直接运行此脚本
if (
    import.meta.url === `file://${process.argv[1]}`) {
    checkAllPages().catch(console.error);
}

export {
    checkAllPages,
    checkURL
};