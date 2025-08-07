# 简化部署脚本使用说明

## 概述

这是一个轻量级的博客部署脚本，专门用于快速更新博客内容、sitemap和CDN资源，避免了完整部署的复杂步骤。

## 功能特点

- ✅ **快速部署**: 1-3分钟完成（vs 原来的5-10分钟）
- ✅ **智能检测**: 只处理变化的文件
- ✅ **正确处理slug**: 使用frontmatter中的slug而不是文件名
- ✅ **模块化设计**: 易于维护和扩展
- ✅ **保持兼容**: 不影响现有的完整部署流程

## 脚本结构

```
scripts/
├── simple-deploy.js              # 主部署脚本
├── modules/
│   ├── change-detector.js        # 变更检测模块
│   ├── sitemap-generator.js      # Sitemap生成模块
│   ├── server-sync.js           # 服务器同步模块
│   └── cdn-sync.js              # CDN同步模块
└── README-简化部署.md            # 使用说明
```

## 使用方法

### 1. 本地运行

```bash
# 运行完整的简化部署
npm run deploy:simple

# 或直接运行
node scripts/simple-deploy.js
```

### 2. 测试各个模块

```bash
# 测试服务器连接
npm run deploy:test-server

# 测试CDN连接
npm run deploy:test-cdn

# 只生成sitemap
npm run deploy:sitemap
```

### 3. GitHub Actions自动部署

当你推送以下路径的文件时，会自动触发简化部署：

- `src/content/blog/**` - 博客文章
- `public/images/**` - 图片资源
- `src/assets/**` - 静态资源

### 4. 手动触发GitHub Actions

在GitHub仓库的Actions页面，选择"简化博客部署"工作流，点击"Run workflow"。

## 环境变量配置

### 必需的环境变量

```bash
# 服务器配置
HOST=your-server-host
USERNAME=your-username
SSH_PRIVATE_KEY=your-ssh-private-key
SSH_PASSPHRASE=your-ssh-passphrase  # 如果有的话
PORT=22  # 可选，默认22

# CDN配置（可选）
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket-name
TENCENT_COS_REGION=ap-guangzhou

# 构建配置
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
```

## 工作流程

1. **变更检测** - 检测博客文章和静态资源的变更
2. **增量构建** - 只构建变化的内容
3. **Sitemap生成** - 使用正确的slug生成sitemap
4. **服务器同步** - 将构建文件同步到服务器
5. **CDN同步** - 上传变化的静态资源到CDN

## Slug处理

### 问题说明

原来的sitemap生成脚本使用文件名作为URL，但实际应该使用frontmatter中的`slug`字段。

### 正确映射示例

```markdown
---
title: "2024年十月重新出发"
slug: "2024-october-fresh-start" # 这个是URL中使用的路径
pubDate: "Jul 19, 2025"
---
```

- **文件名**: `2024年十月重新出发.md`
- **正确URL**: `https://dongboge.cn/blog/2024-october-fresh-start/`
- **错误URL**: `https://dongboge.cn/blog/2024年十月重新出发/`

### 解决方案

简化部署脚本会：

1. 正确读取每个博客文章的frontmatter中的slug
2. 在变更检测时记录文件路径和对应的slug
3. 生成sitemap时使用slug而不是文件名
4. 确保所有URL都是可访问的

## 性能对比

| 项目       | 完整部署            | 简化部署   | 改进       |
| ---------- | ------------------- | ---------- | ---------- |
| 部署时间   | 5-10分钟            | 1-3分钟    | 60-70%减少 |
| 服务器操作 | 重启服务、更新Nginx | 只同步文件 | 减少中断   |
| 资源消耗   | 完整构建            | 增量构建   | 80%减少    |
| 稳定性     | 可能中断服务        | 无服务中断 | 更稳定     |

## 故障排除

### 1. SSH连接失败

```bash
# 测试SSH连接
npm run deploy:test-server

# 检查SSH密钥权限
chmod 600 ~/.ssh/id_rsa
```

### 2. CDN上传失败

```bash
# 测试CDN连接
npm run deploy:test-cdn

# 检查环境变量
echo $TENCENT_SECRET_ID
echo $TENCENT_COS_BUCKET
```

### 3. Sitemap生成错误

```bash
# 单独生成sitemap
npm run deploy:sitemap

# 检查博客文章的frontmatter格式
```

### 4. 构建失败

```bash
# 本地测试构建
npm run build

# 检查Astro配置
```

## 回退方案

如果简化部署出现问题，可以随时使用完整部署：

1. 手动触发完整部署的GitHub Actions
2. 或者使用原来的 `.github/workflows/deploy.yml`

## 监控和日志

部署过程中会显示详细的日志信息：

- 📍 变更检测结果
- 🔨 构建进度
- 📤 同步状态
- ✅ 部署结果

## 贡献和反馈

如果你发现问题或有改进建议，请：

1. 查看日志确定问题
2. 尝试相关的测试命令
3. 提供详细的错误信息

## 版本历史

- **v1.0** - 初始版本，支持基本的增量部署
- 支持正确的slug处理
- 模块化设计，易于维护
