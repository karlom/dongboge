import fs from 'fs';
import path from 'path';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// 手工优化的 slug 映射
const manualSlugs = {
    '2025年应该怎么用大模型.md': 'how-to-use-ai-models-in-2025',
    '编程新手如何学会让cursor干活.md': 'how-beginners-learn-cursor-ai-coding',
    '大语言模型在企业应用中的最佳实践.md': 'llm-enterprise-best-practices',
    'AI时代的企业数字化转型实践指南.md': 'ai-era-digital-transformation-guide',
    'deepseek的100种应用案例.md': 'deepseek-100-use-cases',
    '如何在24小时内拥有自己的生意并开始盈利！.md': 'start-profitable-business-in-24-hours',
    '如何讲好故事.md': 'how-to-tell-good-stories',
    '如何零成本用车.md': 'zero-cost-car-usage-tips',
    '决定了，我要做deepseek培训！.md': 'decided-to-do-deepseek-training',
    '开了个新坑：写一份Dify的教程.md': 'started-writing-dify-tutorial',
    '每天一个做小生意的小技巧.md': 'daily-small-business-tips',
    '你的AI-agent能卖多少钱是由什么决定的.md': 'what-determines-ai-agent-pricing',
    '会不会考察候选人的『AI能力』.md': 'will-companies-test-ai-skills',
    '十个人们害怕开始赚钱的借口.md': 'ten-excuses-people-afraid-making-money',
    '生意好不好做是人的问题.md': 'business-success-depends-on-people',
    '怎么样才能发财？.md': 'how-to-get-rich',
    '做自媒体的路径.md': 'path-to-self-media-success',
    '嘴炮式写代码的流程.md': 'talk-driven-coding-process',
    '重新做一遍个人网站这件事.md': 'rebuilding-personal-website-again',
    '本站被黑记.md': 'website-hacked-incident-report',
    '富人不会说.md': 'what-rich-people-wont-tell-you',
    '东波哥语录.md': 'dongboge-quotes',
    '去参加cocos开发者大会.md': 'attending-cocos-developer-conference',
    '我拉黑了一个我帮助过的微信网友.md': 'blocked-someone-i-helped-on-wechat',
    '我没有赚到认知以外的钱.md': 'cant-earn-money-beyond-cognition',
    '一早上纠结了输入法的问题.md': 'morning-input-method-struggles',
    '因为穷，我逃过了万门的镰刀.md': 'escaped-wanmen-scam-because-poor',
    '在我说要当AI培训师两周后直接起飞了.md': 'ai-trainer-career-took-off-after-two-weeks',
    '人生升维主题视频摘录2024年12月23日.md': 'life-upgrade-video-excerpts-2024-12-23',
    '解决更新插件失败的问题.md': 'solving-plugin-update-failures',
    'brew-updte出错解决方法记录.md': 'fixing-brew-update-errors',
    'reboot-and-select-proper-boot-device的第二种解决方法.md': 'second-solution-boot-device-error',

    // 日记类文章使用日期格式
    '2025年7月19日成功记录.md': '2025-07-19-success-record',
    '2025年7月20日成功日记.md': '2025-07-20-success-diary',
    '2025年7月21日成功日记.md': '2025-07-21-success-diary',
    '2025年7月23日成功记录.md': '2025-07-23-success-record',
    '2025年7月27成功日记.md': '2025-07-27-success-diary',
    '2025年7月28日成功记录.md': '2025-07-28-success-record',
    '2025年7月30日成功记录.md': '2025-07-30-success-record',
    '2025年7月31日成功记录.md': '2025-07-31-success-record',
    '2025年8月2日成功记录.md': '2025-08-02-success-record',
    '2025年8月4日成功记录.md': '2025-08-04-success-record',
    '2025年元旦.md': '2025-new-year',
    '2024年9月28日周六日记.md': '2024-09-28-saturday-diary',
    '2024年9月30日爸爸想打官司.md': '2024-09-30-dad-lawsuit',
    '2024年10月9日我恢复了跑步.md': '2024-10-09-resumed-running',
    '2024年10月14日星期一.md': '2024-10-14-monday',
    '2024年11月21日塔哥科技的业务慢慢步入正轨.md': '2024-11-21-tage-tech-business-on-track',
    '2024年12月4日老婆又辞职了.md': '2024-12-04-wife-quit-job-again',
    '2024年中秋节小记.md': '2024-mid-autumn-festival-notes',
    '2024年十月重新出发.md': '2024-october-fresh-start',
    '2023年终总结.md': '2023-year-end-summary',
    '20241210人生作业.md': '2024-12-10-life-homework',
    '20241222日人生作业.md': '2024-12-22-life-homework',
    '2024-8-19今天就只写了一篇公众号文章并发表了.md': '2024-08-19-wrote-wechat-article'
};

function addSlugToPost(filePath, slug) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 检查是否已经有 slug
    if (content.includes('slug:')) {
        console.log(`跳过 ${path.basename(filePath)} - 已有 slug`);
        return;
    }

    // 找到 frontmatter 的结束位置
    const lines = content.split('\n');
    let frontmatterEnd = -1;
    let inFrontmatter = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            if (!inFrontmatter) {
                inFrontmatter = true;
            } else {
                frontmatterEnd = i;
                break;
            }
        }
    }

    if (frontmatterEnd === -1) {
        console.log(`跳过 ${path.basename(filePath)} - 没有找到 frontmatter`);
        return;
    }

    // 在 frontmatter 结束前添加 slug
    lines.splice(frontmatterEnd, 0, `slug: "${slug}"`);

    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✅ 已为 ${path.basename(filePath)} 添加 slug: ${slug}`);
}

// 处理所有博客文章
const blogDir = path.join(__dirname, '../src/content/blog');
const files = fs.readdirSync(blogDir);

console.log('开始为博客文章添加 slug...\n');

files.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const filePath = path.join(blogDir, file);
        const slug = manualSlugs[file];

        if (slug) {
            addSlugToPost(filePath, slug);
        } else {
            console.log(`⚠️  ${file} 没有预定义的 slug，请手动添加`);
        }
    }
});

console.log('\n完成！现在你的博客文章将使用 SEO 友好的 URL。');
console.log('例如：/blog/how-to-use-ai-models-in-2025');