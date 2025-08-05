# 博客 Slug 优化说明

## 什么是 Slug？

Slug 是 URL 中用来标识特定页面的部分，它应该是：

- 人类可读的
- SEO 友好的
- 简洁明了的
- 使用英文和连字符

## 优化前后对比

### 优化前

```
https://dongboge.com/blog/2025年应该怎么用大模型
```

实际 URL 会被编码成：

```
https://dongboge.com/blog/2025%E5%B9%B4%E5%BA%94%E8%AF%A5%E6%80%8E%E4%B9%88%E7%94%A8%E5%A4%A7%E6%A8%A1%E5%9E%8B
```

### 优化后

```
https://dongboge.com/blog/how-to-use-ai-models-in-2025
```

## 实现方式

1. **修改内容配置**：在 `src/content.config.ts` 中添加了可选的 `slug` 字段
2. **更新路由逻辑**：在 `src/pages/blog/[...slug].astro` 中优先使用自定义 slug
3. **批量添加 slug**：为所有现有文章添加了 SEO 友好的 slug

## 如何为新文章添加 Slug

在文章的 frontmatter 中添加 `slug` 字段：

```markdown
---
title: "你的文章标题"
description: "文章描述"
pubDate: "2025-01-01"
tags: ["标签"]
slug: "your-seo-friendly-slug"
---
```

## Slug 命名规范

1. **使用英文**：避免中文字符
2. **小写字母**：全部使用小写
3. **连字符分隔**：使用 `-` 连接单词
4. **简洁明了**：能够表达文章主题
5. **避免特殊字符**：只使用字母、数字和连字符

### 好的 Slug 示例

- `how-to-use-ai-models-in-2025`
- `enterprise-ai-training-guide`
- `dify-platform-tutorial`
- `2025-01-01-daily-success-record`

### 不好的 Slug 示例

- `2025年应该怎么用大模型` (中文)
- `How_To_Use_AI_Models` (下划线和大写)
- `how.to.use.ai.models` (点号)
- `how-to-use-ai-models-in-2025-and-beyond-with-best-practices` (太长)

## SEO 优势

1. **更好的搜索引擎排名**：英文 slug 更容易被搜索引擎理解
2. **提高点击率**：用户更愿意点击清晰的 URL
3. **社交分享友好**：在社交媒体分享时 URL 更美观
4. **用户体验**：用户可以从 URL 了解页面内容

## 技术实现细节

### 路由逻辑

```javascript
// 使用自定义 slug 或者文件名作为 URL slug
const urlSlug = post.data.slug || post.id;
```

### 内容类型定义

```typescript
schema: ({ image }) =>
  z.object({
    // ... 其他字段
    slug: z.string().optional(), // 添加可选的 slug 字段
  }),
```

## 维护建议

1. **新文章**：创建新文章时务必添加合适的 slug
2. **定期检查**：定期检查是否有文章缺少 slug
3. **保持一致性**：遵循统一的命名规范
4. **避免重复**：确保每个 slug 都是唯一的

## 工具脚本

项目中提供了以下工具脚本：

- `scripts/generate-slugs.js`：生成 slug 建议
- `scripts/add-slugs-to-posts.js`：批量为文章添加 slug
- `scripts/test-slugs.js`：测试 slug 功能

使用方法：

```bash
node scripts/generate-slugs.js
node scripts/add-slugs-to-posts.js
```
