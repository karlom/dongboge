/**
 * Sitemap生成模块
 * 正确处理slug，生成准确的sitemap.xml
 */

import fs from 'fs';
import path from 'path';

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

// 从博客文件提取完整信息
function extractBlogPostInfo(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const frontmatter = parseFrontmatter(content);
        const fileName = path.basename(filePath, path.extname(filePath));

        // 使用slug字段，如果没有则使用文件名
        const slug = frontmatter.slug || fileName;

        return {
            fileName,
            slug,
            title: frontmatter.title || fileName,
            description: frontmatter.description || '',
            pubDate: frontmatter.pubDate ? new Date(frontmatter.pubDate) : new Date(),
            heroImage: frontmatter.heroImage || '',
            tags: frontmatter.tags || [],
            url: `/blog/${slug}/`
        };
    } catch (error) {
        console.warn(`⚠️ 无法解析博客文件: ${filePath}`, error.message);
        return null;
    }
}

// 获取所有博客文章
function getAllBlogPosts() {
    const blogDir = 'src/content/blog';
    const posts = [];

    if (!fs.existsSync(blogDir)) {
        console.warn('⚠️ 博客目录不存在:', blogDir);
        return posts;
    }

    const files = fs.readdirSync(blogDir);

    for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.mdx')) {
            const filePath = path.join(blogDir, file);
            const postInfo = extractBlogPostInfo(filePath);

            if (postInfo) {
                posts.push(postInfo);
            }
        }
    }

    // 按发布日期排序（最新的在前）
    posts.sort((a, b) => b.pubDate - a.pubDate);

    return posts;
}

// 生成sitemap XML内容
function generateSitemapXML(posts) {
    const baseUrl = 'https://dongboge.cn';
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    
    <!-- 首页 - 最高优先级 -->
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
        <image:image>
            <image:loc>${baseUrl}/images/hero1.png</image:loc>
            <image:title>东波哥 - 广州企业AI培训专家</image:title>
            <image:caption>东波哥（杨东波），广州塔哥科技创始人，专业企业AI培训师</image:caption>
        </image:image>
    </url>
    
    <!-- 关于页面 -->
    <url>
        <loc>${baseUrl}/about/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    
    <!-- 服务页面 -->
    <url>
        <loc>${baseUrl}/services/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>
    
    <!-- 联系页面 -->
    <url>
        <loc>${baseUrl}/contact/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    
    <!-- 培训案例页面 -->
    <url>
        <loc>${baseUrl}/training-cases/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    
    <!-- 博客首页 -->
    <url>
        <loc>${baseUrl}/blog/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    
    <!-- RSS订阅 -->
    <url>
        <loc>${baseUrl}/rss.xml</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.5</priority>
    </url>`;

    // 添加所有博客文章
    posts.forEach(post => {
        const lastmod = post.pubDate.toISOString().split('T')[0];
        const url = `${baseUrl}${post.url}`;

        sitemap += `
    
    <!-- 博客文章: ${post.title} -->
    <url>
        <loc>${url}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>`;

        // 如果文章有图片，添加图片信息
        if (post.heroImage) {
            let imageUrl = post.heroImage;

            // 处理相对路径的图片
            if (imageUrl.startsWith('../../assets/')) {
                imageUrl = imageUrl.replace('../../assets/', `${baseUrl}/assets/`);
            } else if (imageUrl.startsWith('../assets/')) {
                imageUrl = imageUrl.replace('../assets/', `${baseUrl}/assets/`);
            } else if (imageUrl.startsWith('/')) {
                imageUrl = `${baseUrl}${imageUrl}`;
            } else if (!imageUrl.startsWith('http')) {
                imageUrl = `${baseUrl}/${imageUrl}`;
            }

            sitemap += `
        <image:image>
            <image:loc>${imageUrl}</image:loc>
            <image:title>${post.title}</image:title>
            <image:caption>${post.description || post.title}</image:caption>
        </image:image>`;
        }

        sitemap += `
    </url>`;
    });

    sitemap += `
    
</urlset>`;

    return sitemap;
}

// 生成sitemap索引文件
function generateSitemapIndex() {
    const baseUrl = 'https://dongboge.cn';
    const currentDate = new Date().toISOString().split('T')[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${baseUrl}/sitemap.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
</sitemapindex>`;
}

// 主生成函数
export async function generateSitemap() {
    try {
        console.log('🗺️ 开始生成sitemap...');

        // 获取所有博客文章
        const posts = getAllBlogPosts();
        console.log(`📝 找到 ${posts.length} 篇博客文章`);

        // 验证slug的唯一性
        const slugs = posts.map(post => post.slug);
        const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

        if (duplicateSlugs.length > 0) {
            console.warn('⚠️ 发现重复的slug:', duplicateSlugs);
        }

        // 显示slug映射信息
        console.log('📋 文件名 → slug 映射:');
        posts.slice(0, 5).forEach(post => {
            if (post.fileName !== post.slug) {
                console.log(`  📄 ${post.fileName} → ${post.slug}`);
            } else {
                console.log(`  📄 ${post.fileName} (使用文件名)`);
            }
        });

        if (posts.length > 5) {
            console.log(`  ... 还有 ${posts.length - 5} 篇文章`);
        }

        // 生成sitemap XML
        const sitemapXML = generateSitemapXML(posts);

        // 确保public目录存在
        const publicDir = 'public';
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, {
                recursive: true
            });
        }

        // 写入sitemap文件
        const sitemapPath = path.join(publicDir, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemapXML, 'utf8');

        // 生成sitemap索引文件
        const sitemapIndexXML = generateSitemapIndex();
        const sitemapIndexPath = path.join(publicDir, 'sitemap-index.xml');
        fs.writeFileSync(sitemapIndexPath, sitemapIndexXML, 'utf8');

        console.log(`✅ Sitemap已生成: ${sitemapPath}`);
        console.log(`✅ Sitemap索引已生成: ${sitemapIndexPath}`);
        console.log(`📊 包含页面数量: ${posts.length + 7} 个页面`);
        console.log(`🔗 Sitemap URL: https://dongboge.cn/sitemap.xml`);

        return {
            success: true,
            totalPages: posts.length + 7,
            blogPosts: posts.length,
            sitemapPath,
            sitemapIndexPath,
            posts: posts.map(post => ({
                title: post.title,
                slug: post.slug,
                url: post.url
            }))
        };

    } catch (error) {
        console.error('❌ 生成sitemap时出错:', error.message);
        throw error;
    }
}