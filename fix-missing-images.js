import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取所有可用的图片文件
function getAvailableImages() {
    const imagesDir = path.join(__dirname, 'public/images/blog_images');
    if (!fs.existsSync(imagesDir)) {
        console.error('图片目录不存在:', imagesDir);
        return [];
    }

    return fs.readdirSync(imagesDir).filter(file =>
        file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
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

// 获取heroImage路径
function getHeroImagePath(frontmatter) {
    const heroImageMatch = frontmatter.match(/heroImage:\s*["']([^"']+)["']/);
    return heroImageMatch ? heroImageMatch[1] : null;
}

// 检查图片是否存在
function imageExists(imagePath) {
    // 移除开头的斜杠并构建完整路径
    const cleanPath = imagePath.replace(/^\//, '');
    const fullPath = path.join(__dirname, 'public', cleanPath);
    return fs.existsSync(fullPath);
}

// 获取随机可用图片
function getRandomAvailableImage(availableImages) {
    return availableImages[Math.floor(Math.random() * availableImages.length)];
}

// 替换frontmatter中的heroImage
function replaceHeroImage(frontmatter, newImagePath) {
    return frontmatter.replace(
        /heroImage:\s*["'][^"']+["']/,
        `heroImage: "/images/blog_images/${newImagePath}"`
    );
}

// 处理单个文件
function processFile(filePath, availableImages) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: bodyContent, hasFrontmatter } = parseFrontmatter(content);

        if (!hasFrontmatter) {
            return;
        }

        const heroImagePath = getHeroImagePath(frontmatter);
        if (!heroImagePath) {
            return;
        }

        // 检查图片是否存在
        if (imageExists(heroImagePath)) {
            console.log(`✅ ${path.basename(filePath)}: 图片存在 ${heroImagePath}`);
            return;
        }

        // 图片不存在，需要替换
        console.log(`❌ ${path.basename(filePath)}: 图片不存在 ${heroImagePath}`);

        const newImage = getRandomAvailableImage(availableImages);
        const newFrontmatter = replaceHeroImage(frontmatter, newImage);
        const newContent = `---\n${newFrontmatter}\n---\n${bodyContent}`;

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`🔧 已修复: ${path.basename(filePath)} -> ${newImage}`);

    } catch (error) {
        console.error(`处理文件 ${filePath} 时出错:`, error.message);
    }
}

// 主函数
function main() {
    const blogDir = path.join(__dirname, 'src/content/blog');
    const availableImages = getAvailableImages();

    console.log('可用图片:', availableImages);
    console.log('');

    if (availableImages.length === 0) {
        console.error('没有找到可用的图片文件');
        return;
    }

    if (!fs.existsSync(blogDir)) {
        console.error('博客目录不存在:', blogDir);
        return;
    }

    const files = fs.readdirSync(blogDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    console.log(`检查 ${mdFiles.length} 个markdown文件...\n`);

    mdFiles.forEach(file => {
        const filePath = path.join(blogDir, file);
        processFile(filePath, availableImages);
    });

    console.log('\n检查完成！');
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };