// 自动提交sitemap到各大搜索引擎的脚本
import fetch from 'node-fetch';

const SITE_URL = 'https://dongboge.com';
const SITEMAP_URL = `${SITE_URL}/sitemap-index.xml`;

// 搜索引擎提交配置
const searchEngines = {
    google: {
        name: 'Google',
        url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
        method: 'GET'
    },
    bing: {
        name: 'Bing',
        url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
        method: 'GET'
    }
};

// 重要页面列表（用于单独提交）
const importantPages = [
    `${SITE_URL}/`,
    `${SITE_URL}/about/`,
    `${SITE_URL}/services/`,
    `${SITE_URL}/contact/`,
    `${SITE_URL}/blog/`,
    `${SITE_URL}/training-cases/`
];

async function submitSitemap() {
    console.log('🚀 开始提交sitemap到搜索引擎...\n');

    for (const [key, engine] of Object.entries(searchEngines)) {
        try {
            console.log(`📤 正在提交到 ${engine.name}...`);

            const response = await fetch(engine.url, {
                method: engine.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SitemapSubmitter/1.0)'
                },
                timeout: 10000
            });

            if (response.ok) {
                console.log(`✅ ${engine.name}: 提交成功`);
            } else {
                console.log(`⚠️ ${engine.name}: 提交可能失败 (状态码: ${response.status})`);
            }

        } catch (error) {
            console.log(`❌ ${engine.name}: 提交失败 - ${error.message}`);
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n📋 手动提交指南:');
    console.log('由于API限制，以下搜索引擎需要手动提交:\n');

    console.log('🔍 百度搜索资源平台:');
    console.log('   1. 访问: https://ziyuan.baidu.com/');
    console.log('   2. 登录后选择网站 → 数据引入 → 链接提交');
    console.log('   3. 选择"sitemap"方式');
    console.log(`   4. 提交: ${SITEMAP_URL}\n`);

    console.log('🔍 搜狗站长平台:');
    console.log('   1. 访问: http://zhanzhang.sogou.com/');
    console.log('   2. 网站管理 → 数据提交 → sitemap提交');
    console.log(`   3. 提交: ${SITEMAP_URL}\n`);

    console.log('🔍 360搜索站长平台:');
    console.log('   1. 访问: http://zhanzhang.so.com/');
    console.log('   2. 数据提交 → sitemap提交');
    console.log(`   3. 提交: ${SITEMAP_URL}\n`);

    console.log('📄 重要页面URL列表（用于手动提交）:');
    importantPages.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
    });
}

// 生成百度主动推送脚本
function generateBaiduPushScript() {
    const script = `#!/bin/bash
# 百度主动推送脚本
# 使用方法: bash baidu-push.sh

SITE_TOKEN="YOUR_BAIDU_SITE_TOKEN"  # 请替换为你的百度站点token
SITE_URL="${SITE_URL}"

# 重要页面列表
urls=(
${importantPages.map(url => `    "${url}"`).join('\n')}
)

echo "开始向百度推送URL..."

for url in "\${urls[@]}"; do
    echo "推送: \$url"
    curl -H 'Content-Type:text/plain' --data-binary "\$url" "http://data.zz.baidu.com/urls?site=\$SITE_URL&token=\$SITE_TOKEN"
    echo ""
    sleep 1
done

echo "推送完成！"`;

    return script;
}

// 生成死链提交列表（用于移除旧内容）
function generateDeadLinksList() {
    const deadLinks = [
        // WordPress常见的旧链接模式
        `${SITE_URL}/wp-admin/`,
        `${SITE_URL}/wp-content/`,
        `${SITE_URL}/wp-includes/`,
        `${SITE_URL}/category/`,
        `${SITE_URL}/tag/`,
        `${SITE_URL}/author/`,
        // 可以根据实际情况添加更多旧链接
    ];

    console.log('\n💀 需要移除的死链列表（复制到搜索引擎管理工具中）:');
    deadLinks.forEach(link => {
        console.log(link);
    });

    return deadLinks;
}

async function main() {
    await submitSitemap();

    console.log('\n' + '='.repeat(60));
    console.log('🛠️  其他有用的脚本和信息:');
    console.log('='.repeat(60));

    // 生成百度推送脚本
    const baiduScript = generateBaiduPushScript();
    require('fs').writeFileSync('baidu-push.sh', baiduScript);
    console.log('✅ 已生成百度主动推送脚本: baidu-push.sh');
    console.log('   使用前请修改其中的SITE_TOKEN');

    // 生成死链列表
    generateDeadLinksList();

    console.log('\n🎯 下一步建议:');
    console.log('1. 手动提交sitemap到百度、搜狗、360等搜索引擎');
    console.log('2. 在Google Search Console中请求重新抓取重要页面');
    console.log('3. 提交死链移除请求');
    console.log('4. 监控索引状态和流量变化');
    console.log('5. 设置301重定向处理旧链接');
}

if (
    import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export {
    submitSitemap,
    generateBaiduPushScript,
    generateDeadLinksList
};