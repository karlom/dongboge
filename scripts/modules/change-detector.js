/**
 * 变更检测模块
 * 检测博客文章和静态资源的变更
 */

import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';

// 手动加载.env文件
function loadEnvFile() {
    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnvFile();

// 解析markdown文件的frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) return {};

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // 移除引号
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            frontmatter[key] = value;
        }
    }

    return frontmatter;
}

// 从博客文件提取信息
function extractBlogInfo(filePath) {
    try {
        console.log(`    🔍 读取博客文件: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            console.log(`    ❌ 文件不存在: ${filePath}`);
            return null;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`    📖 文件内容长度: ${content.length} 字符`);

        const frontmatter = parseFrontmatter(content);
        console.log(`    📋 Frontmatter解析结果:`, {
            title: frontmatter.title,
            slug: frontmatter.slug,
            pubDate: frontmatter.pubDate
        });

        const fileName = path.basename(filePath, path.extname(filePath));

        const blogInfo = {
            filePath,
            fileName,
            title: frontmatter.title || fileName,
            slug: frontmatter.slug || fileName,
            pubDate: frontmatter.pubDate,
            description: frontmatter.description || '',
            heroImage: frontmatter.heroImage || '',
            tags: frontmatter.tags || [],
            url: `/blog/${frontmatter.slug || fileName}/`
        };

        console.log(`    ✅ 博客信息提取成功: ${blogInfo.title} (${blogInfo.slug})`);
        return blogInfo;
    } catch (error) {
        console.error(`❌ 解析博客文件失败: ${filePath}`, error.message);
        console.error(`错误堆栈:`, error.stack);
        return null;
    }
}

// 获取Git变更的文件
function getGitChangedFiles() {
    try {
        // 使用 -z 选项避免路径编码问题，并使用 --no-renames 避免重命名检测
        const output = execSync('git diff --name-only -z --no-renames HEAD~1 HEAD', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'] // 忽略stderr
        });

        // 使用 \0 分割文件名，避免特殊字符问题
        const files = output.split('\0').filter(file => file.length > 0);

        console.log(`📝 Git检测到的原始文件:`, files);

        return files;
    } catch (error) {
        // 如果Git命令失败，返回空数组（比如在CI环境中可能会有问题）
        console.warn('⚠️ 无法获取Git变更，将检查所有文件');
        return [];
    }
}

// 获取所有博客文件（作为fallback）
function getAllBlogFiles() {
    const blogDir = 'src/content/blog';

    if (!fs.existsSync(blogDir)) {
        return [];
    }

    return fs.readdirSync(blogDir)
        .filter(file => file.endsWith('.md') || file.endsWith('.mdx'))
        .map(file => path.join(blogDir, file));
}

// 获取所有静态资源文件
function getAllAssetFiles() {
    const assetPaths = [
        'public/images',
        'src/assets',
        'public/assets'
    ];

    const files = [];

    assetPaths.forEach(assetPath => {
        if (fs.existsSync(assetPath)) {
            const walkDir = (dir) => {
                const entries = fs.readdirSync(dir, {
                    withFileTypes: true
                });

                entries.forEach(entry => {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        walkDir(fullPath);
                    } else {
                        // 只包含常见的静态资源文件
                        const ext = path.extname(entry.name).toLowerCase();
                        if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
                                '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'
                            ].includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                });
            };

            walkDir(assetPath);
        }
    });

    return files;
}

// 检测变更
export async function detectChanges() {
    console.log('🔍 开始检测文件变更...');

    const changes = {
        blog: [],
        assets: [],
        total: 0
    };

    try {
        // 获取Git变更的文件
        const gitChangedFiles = getGitChangedFiles();

        if (gitChangedFiles.length > 0) {
            console.log(`📝 Git检测到 ${gitChangedFiles.length} 个变更文件`);

            // 分析变更的文件
            gitChangedFiles.forEach(file => {
                console.log(`🔍 检查文件: "${file}"`);
                console.log(`  文件长度: ${file.length}`);

                // 更宽松的博客文件匹配 - 使用includes而不是startsWith/endsWith
                const isBlogFile = file.includes('src/content/blog/') && (file.includes('.md') || file.includes('.mdx'));

                if (isBlogFile) {
                    console.log(`  📝 识别为博客文件: ${file}`);

                    // 检查文件是否存在
                    if (!fs.existsSync(file)) {
                        console.log(`  ⚠️ 文件不存在，可能已被删除: ${file}`);
                        return;
                    }

                    // 博客文章变更
                    const blogInfo = extractBlogInfo(file);
                    if (blogInfo) {
                        changes.blog.push(blogInfo);
                        console.log(`  ✅ 博客变更: ${blogInfo.title} (${blogInfo.slug})`);
                    } else {
                        console.log(`  ❌ 无法提取博客信息: ${file}`);
                    }
                } else if (file.includes('images/') || file.includes('assets/') ||
                    (file.includes('public/') && !file.includes('.html'))) {
                    console.log(`  🖼️ 识别为静态资源: ${file}`);

                    // 静态资源变更
                    if (fs.existsSync(file)) {
                        changes.assets.push(file);
                        console.log(`  ✅ 资源变更: ${file}`);
                    } else {
                        console.log(`  ⚠️ 资源文件不存在: ${file}`);
                    }
                } else {
                    console.log(`  ⏭️ 跳过文件（不匹配规则）: ${file}`);
                    console.log(`    - 包含src/content/blog/: ${file.includes('src/content/blog/')}`);
                    console.log(`    - 包含.md: ${file.includes('.md')}`);
                    console.log(`    - 以src/content/blog/开头: ${file.startsWith('src/content/blog/')}`);
                    console.log(`    - 以.md结尾: ${file.endsWith('.md')}`);
                }
            });
        } else {
            // 如果无法获取Git变更，检查最近修改的文件
            console.log('📁 检查所有博客文件的修改时间...');

            const blogFiles = getAllBlogFiles();
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000); // 24小时前

            blogFiles.forEach(file => {
                const stats = fs.statSync(file);
                if (stats.mtime.getTime() > oneDayAgo) {
                    const blogInfo = extractBlogInfo(file);
                    if (blogInfo) {
                        changes.blog.push(blogInfo);
                        console.log(`  📄 最近修改: ${blogInfo.title} (${blogInfo.slug})`);
                    }
                }
            });

            // 检查静态资源
            const assetFiles = getAllAssetFiles();
            assetFiles.forEach(file => {
                const stats = fs.statSync(file);
                if (stats.mtime.getTime() > oneDayAgo) {
                    changes.assets.push(file);
                    console.log(`  🖼️ 最近修改: ${file}`);
                }
            });
        }

        changes.total = changes.blog.length + changes.assets.length;

        console.log(`✅ 变更检测完成: ${changes.total} 个文件`);

        return changes;

    } catch (error) {
        console.error('❌ 变更检测失败:', error.message);
        throw error;
    }
}