# 东波哥的个人网站

一个基于 Astro 构建的现代化个人技术博客，专注于分享前端开发经验、技术洞察与个人成长。

## ✨ 特性

- 🎨 现代化的响应式设计
- 📱 移动端友好的界面
- 🚀 基于 Astro 的极速性能
- 📝 Markdown & MDX 支持
- 🏷️ 文章标签系统
- 🔍 SEO 优化
- 📊 100/100 Lighthouse 性能评分
- 📡 RSS 订阅支持
- 🗺️ 站点地图
- 🎯 平滑滚动和交互动画

## 🎯 首页设计

首页采用现代化的设计理念，包含：

- **Hero Section（第一屏）**：个人介绍、头像、社交链接
- **Blog Section（第二屏）**：最新文章展示，支持标签和分类
- **响应式布局**：完美适配桌面端和移动端
- **交互动画**：平滑滚动、悬停效果、加载动画

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
├── public/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   └── pages/
├── astro.config.mjs
├── README.md
├── package.json
└── tsconfig.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 `http://localhost:4321` 查看效果

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 🎨 自定义

### 修改个人信息

编辑 `src/consts.ts` 文件来更新网站标题和描述：

```typescript
export const SITE_TITLE = '你的博客标题';
export const SITE_DESCRIPTION = '你的博客描述';
```

### 添加新文章

在 `src/content/blog/` 目录下创建新的 Markdown 文件：

```markdown
---
title: '文章标题'
description: '文章描述'
pubDate: '2025-01-01'
tags: ['标签1', '标签2']
heroImage: '/path/to/image.jpg'
---

文章内容...
```

### 自定义样式

项目使用 Tailwind CSS，可以在 `src/styles/global.css` 中添加自定义样式。

## 📚 技术栈

- [Astro](https://astro.build/) - 静态站点生成器
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Markdown](https://www.markdownguide.org/) - 内容编写

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
