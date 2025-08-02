import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义标签与图片的映射关系
const tagImageMapping = {
    '生活': ['life.png', 'life1.png', 'life2.jpg'],
    '日常': ['daily.png', 'daily1.jpg', 'daily2.jpg'],
    '工作': ['work.png', 'work2.jpg'],
    '技术': ['tech.png', 'tech1.png', 'tech2.jpg'],
    '成功': ['success.png', 'success1.jpg', 'success2.png'],
    '摘录': ['zhailu.png', 'zhailu1.png', 'zhailu2.jpg'],
    '默认': ['default.png', 'default1.png', 'default2.jpg']
};

// 获取随机图片
function getRandomImage(tags) {
    // 首先尝试根据标签匹配图片
    for (const tag of tags) {
        if (tagImageMapping[tag]) {
            const images = tagImageMapping[tag];
            return images[Math.floor(Math.random() * images.length)];
        }
    }

    // 如果没有匹配的标签，使用默认图片
    const defaultImages = tagImageMapping['默认'];
    return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

// 解析markdown文件的frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { frontmatter: '', content: content, hasFrontmatter: false };
    }

    return {
        frontmatter: match[1],
        content: match[2],
        hasFrontmatter: true
    };
}

// 解析标签
function parseTags(frontmatter) {
    const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
    if (!tagsMatch) return [];

    return tagsMatch[1]
        .split(',')
        .map(tag => tag.trim().replace(/['"]/g, ''));
}

// 检查是否已有heroImage
function hasHeroImage(frontmatter) {
    return frontmatter.includes('heroImage:');
}

// 添加heroImage到frontmatter
function addHeroImage(frontmatter, imagePath) {
    // 在frontmatter的最后添加heroImage
    return frontmatter + `\nheroImage: "/images/blog_images/${imagePath}"`;
}

// 处理单个文件
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: bodyContent, hasFrontmatter } = parseFrontmatter(content);

        if (!hasFrontmatter) {
            console.log(`跳过文件 ${filePath}: 没有frontmatter`);
            return;
        }

        // 检查是否已有配图
        if (hasHeroImage(frontmatter)) {
            console.log(`跳过文件 ${filePath}: 已有配图`);
            return;
        }

        // 解析标签
        const tags = parseTags(frontmatter);
        console.log(`处理文件 ${filePath}, 标签: ${tags.join(', ')}`);

        // 获取随机图片
        const randomImage = getRandomImage(tags);
        console.log(`为文件 ${filePath} 选择图片: ${randomImage}`);

        // 添加heroImage
        const newFrontmatter = addHeroImage(frontmatter, randomImage);
        const newContent = `---\n${newFrontmatter}\n---\n${bodyContent}`;

        // 写回文件
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ 已为 ${filePath} 添加配图: ${randomImage}`);

    } catch (error) {
        console.error(`处理文件 ${filePath} 时出错:`, error.message);
    }
}

// 主函数
function main() {
    const blogDir = path.join(__dirname, 'src/content/blog');

    if (!fs.existsSync(blogDir)) {
        console.error('博客目录不存在:', blogDir);
        return;
    }

    const files = fs.readdirSync(blogDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    console.log(`找到 ${mdFiles.length} 个markdown文件`);
    console.log('开始处理...\n');

    mdFiles.forEach(file => {
        const filePath = path.join(blogDir, file);
        processFile(filePath);
    });

    console.log('\n处理完成！');
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main, processFile, getRandomImage };
