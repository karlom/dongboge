// 生成完整的sitemap，包含所有博客文章（不依赖Astro API）
import fs from 'fs';
import path from 'path';

async function generateCompleteSitemap() {
    try {
        // 扫描博客文章目录
        const blogDir = 'src/content/blog';
        const posts = [];

        if (fs.existsSync(blogDir)) {
            const files = fs.readdirSync(blogDir);

            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.mdx')) {
                    const filePath = path.join(blogDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');

                    // 提取frontmatter中的信息
                    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                    if (frontmatterMatch) {
                        const frontmatter = frontmatterMatch[1];
                        const titleMatch = frontmatter.match(/title:\s*['"]?([^'"]+)['"]?/);
                        const dateMatch = frontmatter.match(/pubDate:\s*['"]?([^'"]+)['"]?/);
                        const descMatch = frontmatter.match(/description:\s*['"]?([^'"]+)['"]?/);
                        const imageMatch = frontmatter.match(/heroImage:\s*['"]?([^'"]+)['"]?/);

                        const slug = file.replace(/\.(md|mdx)$/, '');
                        const title = titleMatch ? titleMatch[1] : slug;
                        const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();
                        const description = descMatch ? descMatch[1] : '';
                        const heroImage = imageMatch ? imageMatch[1] : '';

                        posts.push({
                            id: slug,
                            data: {
                                title: title,
                                pubDate: pubDate,
                                description: description,
                                heroImage: heroImage
                            }
                        });
                    }
                }
            }
        }

        const baseUrl = 'https://dongboge.com';
        const currentDate = new Date().toISOString().split('T')[0];

        console.log(`找到 ${posts.length} 篇博客文章`);

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
            const lastmod = post.data.pubDate ? post.data.pubDate.toISOString().split('T')[0] : currentDate;
            const slug = post.id;

            sitemap += `
    
    <!-- 博客文章: ${post.data.title} -->
    <url>
        <loc>${baseUrl}/blog/${slug}/</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>`;

            // 如果文章有图片，添加图片信息
            if (post.data.heroImage) {
                const imageUrl = post.data.heroImage.startsWith('http') ? post.data.heroImage : baseUrl + post.data.heroImage;
                sitemap += `
        <image:image>
            <image:loc>${imageUrl}</image:loc>
            <image:title>${post.data.title}</image:title>
            <image:caption>${post.data.description || post.data.title}</image:caption>
        </image:image>`;
            }

            sitemap += `
    </url>`;
        });

        sitemap += `
    
</urlset>`;

        // 确保public目录存在
        const publicDir = 'public';
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, {
                recursive: true
            });
        }

        // 写入sitemap文件
        const sitemapPath = path.join(publicDir, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemap, 'utf8');

        console.log(`✅ Sitemap已生成: ${sitemapPath}`);
        console.log(`📊 包含页面数量: ${posts.length + 7} 个页面`);
        console.log(`🔗 Sitemap URL: ${baseUrl}/sitemap.xml`);

        // 生成sitemap索引文件
        const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${baseUrl}/sitemap.xml</loc>
        <lastmod>${currentDate}</lastmod>
    </sitemap>
</sitemapindex>`;

        const sitemapIndexPath = path.join(publicDir, 'sitemap-index.xml');
        fs.writeFileSync(sitemapIndexPath, sitemapIndex, 'utf8');

        console.log(`✅ Sitemap索引已生成: ${sitemapIndexPath}`);

        // 显示找到的博客文章列表
        if (posts.length > 0) {
            console.log('\n📝 包含的博客文章:');
            posts.forEach((post, index) => {
                console.log(`   ${index + 1}. ${post.data.title} (${post.id})`);
            });
        }

        return {
            success: true,
            totalPages: posts.length + 7,
            blogPosts: posts.length,
            sitemapPath,
            sitemapIndexPath
        };

    } catch (error) {
        console.error('❌ 生成sitemap时出错:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 如果直接运行此脚本
if (
    import.meta.url === `file://${process.argv[1]}`) {
    generateCompleteSitemap();
}

export {
    generateCompleteSitemap
};