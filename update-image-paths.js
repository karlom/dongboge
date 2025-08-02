import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 更新heroImage路径
function updateHeroImagePath(frontmatter) {
    return frontmatter.replace(
        /heroImage:\s*["']\/images\/blog_images\/([^"']+)["']/g,
        "heroImage: '../../assets/$1'"
    );
}

// 处理单个文件
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontmatter, content: bodyContent, hasFrontmatter } = parseFrontmatter(content);

        if (!hasFrontmatter) {
            return;
        }

        const originalFrontmatter = frontmatter;
        const updatedFrontmatter = updateHeroImagePath(frontmatter);

        if (originalFrontmatter !== updatedFrontmatter) {
            const newContent = `---\n${updatedFrontmatter}\n---\n${bodyContent}`;
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ 已更新: ${path.basename(filePath)}`);
        } else {
            console.log(`⏭️  跳过: ${path.basename(filePath)} (无需更新)`);
        }

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

    console.log(`更新 ${mdFiles.length} 个markdown文件的图片路径...\n`);

    mdFiles.forEach(file => {
        const filePath = path.join(blogDir, file);
        processFile(filePath);
    });

    console.log('\n路径更新完成！');
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };