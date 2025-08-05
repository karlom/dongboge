import fs from 'fs';
import path from 'path';
import {
    fileURLToPath
} from 'url';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// 中文转拼音的简单映射（你可以使用更完整的库如 pinyin）
function chineseToSlug(text) {
    // 移除文件扩展名
    text = text.replace(/\.md$/, '');

    // 简单的中文到英文的转换规则
    const replacements = {
        '年': 'year',
        '月': 'month',
        '日': 'day',
        '成功': 'success',
        '记录': 'record',
        '日记': 'diary',
        '总结': 'summary',
        '人生': 'life',
        '作业': 'homework',
        '应该': 'should',
        '怎么': 'how',
        '用': 'use',
        '大模型': 'ai-model',
        '编程': 'programming',
        '新手': 'beginner',
        '学会': 'learn',
        '让': 'make',
        '干活': 'work',
        '企业': 'enterprise',
        '应用': 'application',
        '最佳': 'best',
        '实践': 'practice',
        '语录': 'quotes',
        '富人': 'rich-people',
        '不会': 'wont',
        '说': 'say',
        '会不会': 'will-or-not',
        '考察': 'examine',
        '候选人': 'candidate',
        '能力': 'ability',
        '解决': 'solve',
        '更新': 'update',
        '插件': 'plugin',
        '失败': 'failure',
        '问题': 'problem',
        '决定': 'decide',
        '培训': 'training',
        '开了': 'started',
        '新坑': 'new-project',
        '写': 'write',
        '教程': 'tutorial',
        '每天': 'daily',
        '小生意': 'small-business',
        '小技巧': 'tips',
        '你的': 'your',
        '能': 'can',
        '卖': 'sell',
        '多少钱': 'how-much',
        '由': 'by',
        '什么': 'what',
        '决定的': 'decided',
        '参加': 'attend',
        '开发者': 'developer',
        '大会': 'conference',
        '升维': 'upgrade',
        '主题': 'theme',
        '视频': 'video',
        '摘录': 'excerpt',
        '如何': 'how-to',
        '讲好': 'tell-good',
        '故事': 'story',
        '零成本': 'zero-cost',
        '用车': 'car-usage',
        '小时': 'hours',
        '内': 'within',
        '拥有': 'own',
        '自己的': 'own',
        '生意': 'business',
        '并': 'and',
        '开始': 'start',
        '盈利': 'profit',
        '好不好': 'good-or-not',
        '做': 'do',
        '是': 'is',
        '人的': 'peoples',
        '十个': 'ten',
        '人们': 'people',
        '害怕': 'afraid',
        '赚钱': 'make-money',
        '借口': 'excuse',
        '我': 'i',
        '拉黑了': 'blocked',
        '一个': 'one',
        '帮助过的': 'helped',
        '微信': 'wechat',
        '网友': 'friend',
        '没有': 'no',
        '赚到': 'earned',
        '认知': 'cognition',
        '以外的': 'beyond',
        '钱': 'money',
        '一早上': 'morning',
        '纠结了': 'struggled-with',
        '输入法': 'input-method',
        '因为': 'because',
        '穷': 'poor',
        '逃过了': 'escaped',
        '万门': 'wanmen',
        '镰刀': 'scythe',
        '在': 'in',
        '说要': 'said-to',
        '当': 'be',
        '培训师': 'trainer',
        '两周后': 'two-weeks-later',
        '直接': 'directly',
        '起飞了': 'took-off',
        '怎么样': 'how',
        '才能': 'can',
        '发财': 'get-rich',
        '重新': 'again',
        '一遍': 'once',
        '个人网站': 'personal-website',
        '这件事': 'this-thing',
        '嘴炮式': 'talk-style',
        '写代码': 'coding',
        '流程': 'process',
        '自媒体': 'self-media',
        '路径': 'path',
        '时代': 'era',
        '数字化': 'digital',
        '转型': 'transformation',
        '指南': 'guide',
        '出错': 'error',
        '方法': 'method',
        '种': 'types',
        '案例': 'cases',
        '第二种': 'second',
        '本站': 'this-site',
        '被黑': 'hacked',
        '记': 'note'
    };

    // 替换中文词汇
    let slug = text;
    for (const [chinese, english] of Object.entries(replacements)) {
        slug = slug.replace(new RegExp(chinese, 'g'), english);
    }

    // 处理日期格式
    slug = slug.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1-$2-$3');
    slug = slug.replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (match, year, month, day) => {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    });

    // 清理和格式化
    slug = slug
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // 移除特殊字符
        .replace(/\s+/g, '-') // 空格转连字符
        .replace(/-+/g, '-') // 多个连字符合并
        .replace(/^-|-$/g, ''); // 移除首尾连字符

    return slug;
}

// 读取博客目录
const blogDir = path.join(__dirname, '../src/content/blog');
const files = fs.readdirSync(blogDir);

console.log('建议的 slug 映射：\n');

files.forEach(file => {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
        const slug = chineseToSlug(file);
        console.log(`文件: ${file}`);
        console.log(`建议 slug: ${slug}`);
        console.log('---');
    }
});

console.log('\n使用方法：');
console.log('1. 在每个博客文章的 frontmatter 中添加 slug 字段');
console.log('2. 例如：slug: "how-to-use-ai-in-2025"');
console.log('3. 这样 URL 就会变成 /blog/how-to-use-ai-in-2025');