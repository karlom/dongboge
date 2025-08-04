# 博客快速部署指南

## 🚀 自动部署

### 博客文章更新（推荐）
当你只更新博客内容时，系统会自动检测并进行快速部署：

```bash
git add .
git commit -m "新增博客文章：标题"
git push
```

⚡ **快速部署特点**：
- 自动检测博客文件变更
- 只更新必要的文件
- 部署时间约2-3分钟
- 保留CDN增量更新

### 代码功能更新
当修改网站功能代码时，会自动进行完整部署：

```bash
git add .
git commit -m "更新网站功能"
git push
```

### 手动选择部署类型
在GitHub Actions页面可以手动触发：
- **auto**: 自动检测（默认）
- **blog_only**: 仅博客内容
- **full**: 完整部署

## 📝 部署策略

| 变更类型 | 检测规则 | 部署方式 | 时间 |
|---------|---------|---------|------|
| 仅博客文章 | `src/content/blog/` | 快速部署 | 2-3分钟 |
| 代码功能 | 其他文件 | 完整部署 | 5-8分钟 |
| 手动选择 | 用户指定 | 按选择执行 | 变化 |

## 🔧 紧急修复

如果网站出现问题，使用修复脚本：

```bash
chmod +x fix-file-structure.sh
./fix-file-structure.sh your-server-ip your-username ~/.ssh/id_rsa
```

## 📊 部署验证

部署完成后会自动验证：
- ✅ 服务进程状态
- ✅ 端口监听状态  
- ✅ 本地响应测试
- ✅ 外部访问测试

访问 https://dongboge.cn 确认网站正常运行。

## 🎯 优化特性

- **智能检测**: 自动识别变更类型
- **CDN同步**: 保持CDN资源更新
- **快速重启**: 博客更新只重启服务
- **错误恢复**: 自动验证和修复机制

## 📁 关键文件

```
dongboge/
├── .github/workflows/deploy.yml  # 部署配置
├── fix-file-structure.sh         # 紧急修复脚本
├── scripts/incremental-upload.cjs # CDN更新脚本
└── DEPLOYMENT.md                 # 本文档
```

现在你可以专注于写博客，部署过程已经完全自动化和优化！