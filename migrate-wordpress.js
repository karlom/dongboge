#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import TurndownService from 'turndown';

// 配置你的 WordPress 站点信息
const WORDPRESS_URL = 'https://www.dongboge.cn'; // 东博哥的博客
const OUTPUT_DIR = './src/content/blog';

// 初始化 HTML 到 Markdown 转换器
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// 清理文件名，支持中文
function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '') // 移除文件系统不支持的字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .replace(/-+/g, '-') // 多个连字符合并为一个
    .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
    .trim()
    .substring(0, 100); // 限制文件名长度
}

// 格式化日期为 Astro 需要的格式
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit' 
  });
}

// 提取标签
function extractTags(categories, tags) {
  const allTags = [];
  
  if (categories && categories.length > 0) {
    categories.forEach(cat => allTags.push(cat.name));
  }
  
  if (tags && tags.length > 0) {
    tags.forEach(tag => allTags.push(tag.name));
  }
  
  return allTags;
}

// 获取所有 WordPress 文章（支持分页）
async function fetchWordPressPosts() {
  try {
    console.log('正在获取 WordPress 文章...');
    
    let allPosts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`正在获取第 ${page} 页...`);
      
      const response = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts?_embed&per_page=100&page=${page}`);
      
      if (!response.ok) {
        if (response.status === 400 && page > 1) {
          // 没有更多页面了
          hasMore = false;
          break;
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
      }
      
      const posts = await response.json();
      
      if (posts.length === 0) {
        hasMore = false;
      } else {
        allPosts = allPosts.concat(posts);
        page++;
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`总共找到 ${allPosts.length} 篇文章`);
    return allPosts;
    
  } catch (error) {
    console.error('获取文章失败:', error);
    console.log('请检查以下几点:');
    console.log('1. WordPress 站点 URL 是否正确');
    console.log('2. 站点是否启用了 REST API');
    console.log('3. 网络连接是否正常');
    console.log('4. 站点是否有访问限制');
    return [];
  }
}

// 转换单篇文章
function convertPost(post) {
  const title = post.title.rendered.replace(/"/g, '\\"'); // 转义引号
  const content = post.content.rendered;
  
  // 清理摘要，移除 HTML 标签和多余空白
  let excerpt = post.excerpt.rendered
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // 如果摘要为空，从内容中提取前150个字符
  if (!excerpt) {
    excerpt = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150) + '...';
  }
  
  excerpt = excerpt.replace(/"/g, '\\"'); // 转义引号
  
  const pubDate = formatDate(post.date);
  const updatedDate = post.modified !== post.date ? formatDate(post.modified) : null;
  
  // 提取分类和标签
  const categories = post._embedded?.['wp:term']?.[0] || [];
  const tags = post._embedded?.['wp:term']?.[1] || [];
  const allTags = extractTags(categories, tags);
  
  // 提取特色图片
  let heroImage = null;
  if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
    heroImage = post._embedded['wp:featuredmedia'][0].source_url;
  }
  
  // 配置 Turndown 转换器，优化中文内容
  turndownService.addRule('removeComments', {
    filter: function (node) {
      return node.nodeType === 8; // 移除 HTML 注释
    },
    replacement: function () {
      return '';
    }
  });
  
  // 转换 HTML 内容为 Markdown
  let markdownContent = turndownService.turndown(content);
  
  // 清理转换后的内容
  markdownContent = markdownContent
    .replace(/\n\s*\n\s*\n/g, '\n\n') // 移除多余的空行
    .replace(/^\s+|\s+$/g, '') // 移除开头和结尾的空白
    .trim();
  
  // 生成 frontmatter
  let frontmatter = `---
title: "${title}"
description: "${excerpt}"
pubDate: "${pubDate}"`;

  if (updatedDate) {
    frontmatter += `\nupdatedDate: "${updatedDate}"`;
  }
  
  if (heroImage) {
    frontmatter += `\nheroImage: "${heroImage}"`;
  }
  
  if (allTags.length > 0) {
    frontmatter += `\ntags: [${allTags.map(tag => `"${tag.replace(/"/g, '\\"')}"`).join(', ')}]`;
  }
  
  frontmatter += '\n---\n\n';
  
  return {
    filename: sanitizeFilename(title) + '.md',
    content: frontmatter + markdownContent,
    originalTitle: post.title.rendered
  };
}

// 主函数
async function migrateWordPress() {
  console.log('🚀 开始从 dongboge.cn 迁移 WordPress 文章...');
  console.log(`目标目录: ${OUTPUT_DIR}`);
  
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 创建目录: ${OUTPUT_DIR}`);
  }
  
  // 获取文章
  const posts = await fetchWordPressPosts();
  
  if (posts.length === 0) {
    console.log('❌ 没有找到文章，迁移终止');
    return;
  }
  
  // 转换并保存文章
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  console.log('\n📝 开始转换文章...');
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    try {
      const convertedPost = convertPost(post);
      const filePath = path.join(OUTPUT_DIR, convertedPost.filename);
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        console.log(`⚠️  文件已存在，跳过: ${convertedPost.filename}`);
        continue;
      }
      
      fs.writeFileSync(filePath, convertedPost.content, 'utf8');
      console.log(`✅ [${i + 1}/${posts.length}] ${convertedPost.originalTitle} → ${convertedPost.filename}`);
      successCount++;
      
    } catch (error) {
      errorCount++;
      const errorMsg = `转换失败: ${post.title?.rendered || '未知标题'} - ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ [${i + 1}/${posts.length}] ${errorMsg}`);
    }
  }
  
  // 输出迁移结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 迁移完成统计:');
  console.log(`✅ 成功: ${successCount} 篇`);
  console.log(`❌ 失败: ${errorCount} 篇`);
  console.log(`📁 保存位置: ${OUTPUT_DIR}`);
  
  if (errors.length > 0) {
    console.log('\n❌ 错误详情:');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  if (successCount > 0) {
    console.log('\n🎉 迁移成功！你可以运行以下命令查看结果:');
    console.log('npm run dev');
  }
}

// 运行迁移
migrateWordPress().catch(console.error);