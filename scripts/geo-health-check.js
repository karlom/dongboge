#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const failures = [];
const passes = [];

function pass(message) {
  passes.push(message);
  console.log(`✅ ${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`❌ ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  if (fs.existsSync(path.join(root, relativePath))) pass(`${relativePath} 存在`);
  else fail(`${relativePath} 不存在`);
}

const requiredFiles = [
  'public/robots.txt',
  'public/llms.txt',
  'public/sitemap.xml',
  'public/sitemap-index.xml',
  'src/data/siteFacts.ts',
  'docs/GEO事实库.md',
  'docs/GEO监测问题集.csv',
];
requiredFiles.forEach(requireFile);

const robots = read('public/robots.txt');
for (const agent of ['OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'PerplexityBot']) {
  robots.includes(`User-agent: ${agent}`)
    ? pass(`robots.txt 已声明 ${agent}`)
    : fail(`robots.txt 缺少 ${agent}`);
}

const blogDir = path.join(root, 'src/content/blog');
const files = fs.readdirSync(blogDir).filter((file) => /\.mdx?$/.test(file));
const slugs = new Map();
for (const file of files) {
  const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
  const match = content.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  if (!match) {
    fail(`${file} 缺少 slug`);
    continue;
  }
  const slug = match[1].trim();
  if (slugs.has(slug)) fail(`slug 重复: ${slug} (${slugs.get(slug)}, ${file})`);
  slugs.set(slug, file);
}
if (slugs.size === files.length) pass(`${files.length} 篇内容均有唯一 slug`);

const requiredTopicSlugs = [
  'enterprise-ai-training-guide',
  'enterprise-ai-productivity-guide',
  'enterprise-ai-agent-dify-guide',
  'guangzhou-enterprise-ai-training-selection',
  'enterprise-ai-training-course-design',
  'enterprise-ai-training-pricing',
  'enterprise-ai-training-preparation',
  'measure-enterprise-ai-training-results',
  'bank-ai-productivity-training',
  'enterprise-ai-usage-policy',
  'enterprise-knowledge-base-qa-guide',
  'custom-ai-agent-vs-saas',
  'dify-enterprise-use-cases',
];
for (const slug of requiredTopicSlugs) {
  slugs.has(slug) ? pass(`内容集群页面已建立: ${slug}`) : fail(`缺少内容集群页面: ${slug}`);
}

const sourceFiles = [
  'src/pages/index.astro',
  'src/pages/blog/index.astro',
  'src/pages/rss.xml.js',
  'src/components/BlogNavigation.astro',
];
const legacyUrlUsages = sourceFiles.filter((file) => /(?:post|blogPost)\.id/.test(read(file)));
legacyUrlUsages.length === 0
  ? pass('核心站内链接和 RSS 不再使用 post.id')
  : fail(`仍使用 post.id: ${legacyUrlUsages.join(', ')}`);

const englishPages = [];
for (const file of ['src/layouts/BlogPost.astro', 'src/pages/blog/index.astro']) {
  if (read(file).includes('lang="en"')) englishPages.push(file);
}
englishPages.length === 0
  ? pass('中文博客页面均使用 zh-CN')
  : fail(`中文页面仍标记为 en: ${englishPages.join(', ')}`);

const sitemap = read('public/sitemap.xml');
for (const slug of requiredTopicSlugs) {
  if (!sitemap.includes(`/blog/${slug}/`)) fail(`sitemap 缺少 ${slug}`);
}
if (!failures.some((item) => item.startsWith('sitemap 缺少'))) {
  pass('内容集群 URL 已进入 sitemap');
}

const requiredRoutes = [
  '/services/enterprise-ai-training/',
  '/services/ai-consulting/',
  '/services/ai-agent-development/',
  '/services/dify-implementation/',
  '/training-cases/huanan-tech/',
  '/training-cases/guangzhou-transport/',
  '/training-cases/caizhi-lin/',
  '/training-cases/news-association/',
  '/training-cases/hengrun-school/',
  '/training-cases/guangzhou-youth/',
];
for (const route of requiredRoutes) {
  sitemap.includes(route) ? pass(`sitemap 已包含 ${route}`) : fail(`sitemap 缺少 ${route}`);
}

for (const slug of requiredTopicSlugs) {
  const file = slugs.get(slug);
  if (!file) continue;
  const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
  const links = [...content.matchAll(/\]\(\/blog\/([^/)]+)\/?\)/g)].map((match) => match[1]);
  const broken = links.filter((target) => !slugs.has(target));
  broken.length === 0
    ? pass(`${slug} 的博客内链均可解析`)
    : fail(`${slug} 存在无效博客内链: ${broken.join(', ')}`);
}

const builtArticle = path.join(root, 'dist/client/blog/enterprise-ai-training-guide/index.html');
if (fs.existsSync(builtArticle)) {
  const html = fs.readFileSync(builtArticle, 'utf8');
  html.includes('lang="zh-CN"') ? pass('构建产物使用 zh-CN') : fail('构建产物语言标记错误');
  html.includes('BlogPosting') ? pass('构建产物包含 BlogPosting JSON-LD') : fail('构建产物缺少 BlogPosting JSON-LD');
  html.includes('BreadcrumbList') ? pass('构建产物包含 BreadcrumbList JSON-LD') : fail('构建产物缺少 BreadcrumbList JSON-LD');
  html.includes('rel="author"') ? pass('构建产物包含可见作者链接') : fail('构建产物缺少作者链接');
} else {
  console.log('ℹ️ 尚未发现 dist 构建产物，跳过 HTML 产物检查');
}

const rows = read('docs/GEO监测问题集.csv').trim().split('\n');
rows.length === 31 ? pass('GEO 监测表包含 30 个固定问题') : fail(`GEO 监测问题数应为 30，当前为 ${rows.length - 1}`);

console.log(`\n检查完成：${passes.length} 项通过，${failures.length} 项失败。`);
if (failures.length > 0) process.exitCode = 1;
