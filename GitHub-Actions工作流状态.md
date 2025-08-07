# GitHub Actions 工作流状态总结

## 🚀 当前活跃的工作流

### 自动触发的工作流

- **`simple-deploy.yml`** - 简化博客部署 ✅
  - 触发条件：推送博客内容、图片、脚本等
  - 用途：日常博客更新的快速部署

## 🛠️ 手动触发的工作流

### 部署相关

- **`deploy.yml`** - 日常更新博客（已禁用自动触发）
  - 触发方式：仅手动触发
  - 用途：完整部署的备用方案

- **`complete-deploy.yml`** - 完整部署到服务器（已禁用自动触发）
  - 触发方式：仅手动触发
  - 用途：完整的服务器部署

- **`deploy-fixed.yml`** - 修复版部署
  - 触发方式：仅手动触发
  - 用途：修复版的部署方案

### 维护相关

- **`fix-routing.yml`** - 修复路由问题
  - 触发方式：仅手动触发
  - 用途：路由问题的修复

- **`force-fix-nginx.yml`** - 强制修复Nginx配置
  - 触发方式：仅手动触发
  - 用途：Nginx配置的强制修复

## 📋 工作流触发规则

### 自动触发（只有一个）

```yaml
# simple-deploy.yml
on:
  push:
    branches: [main, master]
    paths:
      - "src/content/blog/**" # 博客文章
      - "public/images/**" # 图片资源
      - "src/assets/**" # 静态资源
      - "scripts/simple-deploy.js" # 部署脚本
      - "scripts/modules/**" # 部署模块
      - "public/sitemap.xml" # Sitemap文件
```

### 手动触发（所有其他工作流）

```yaml
on:
  workflow_dispatch: # 只能在GitHub Actions页面手动运行
```

## ✅ 问题解决

### 之前的问题

- 多个工作流同时监听push事件
- 一次提交触发多个部署任务
- 资源浪费和潜在冲突

### 解决方案

- ✅ 禁用了 `complete-deploy.yml` 的自动触发
- ✅ 确认其他工作流都是手动触发
- ✅ 只保留 `simple-deploy.yml` 自动运行

### 现在的状态

- 🎯 推送博客内容 → 只触发简化部署
- 🎯 需要完整部署 → 手动触发相应工作流
- 🎯 需要修复问题 → 手动触发修复工作流

## 🔧 使用建议

### 日常使用

- 推送博客文章 → 自动触发简化部署 ✅
- 推送图片资源 → 自动触发简化部署 ✅
- 推送其他代码 → 不会自动触发任何部署 ✅

### 特殊情况

- 需要完整部署 → 手动运行 `complete-deploy.yml`
- 部署出现问题 → 手动运行相应的修复工作流
- 测试新功能 → 手动运行 `deploy-fixed.yml`

## 📊 预期效果

- ✅ 避免重复部署
- ✅ 减少资源消耗
- ✅ 提高部署效率
- ✅ 降低冲突风险

现在你的GitHub Actions配置已经优化，只有简化部署会自动运行！🚀
