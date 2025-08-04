# 博客快速部署指南

## 🚀 自动部署流程

### 博客文章更新（2-3分钟）
```bash
git add .
git commit -m "新增博客：文章标题"
git push
```

### 功能代码更新（5-8分钟）
```bash
git add .
git commit -m "更新网站功能"
git push
```

## 🎯 智能部署策略

- **博客更新检测**：自动识别`src/content/blog/`目录变更
- **增量CDN上传**：只上传变化的静态资源
- **快速重启**：博客更新只重启应用服务
- **完整部署**：功能更新时重新配置所有服务

## 📁 精简后的项目结构

```
dongboge/
├── src/                           # 源代码
├── scripts/                       # 核心脚本
│   ├── ensure-dependencies.cjs    # 依赖检查
│   ├── incremental-upload.cjs     # CDN增量上传
│   ├── server-diagnostic.sh       # 服务器诊断
│   └── setup-cos-cors-simple.cjs  # COS配置
├── .github/workflows/deploy.yml   # 自动部署
└── DEPLOYMENT.md                  # 部署说明
```

## 🔧 环境变量配置

GitHub Secrets中需要配置：
- `COS_SECRET_ID`: 腾讯云密钥ID
- `COS_SECRET_KEY`: 腾讯云密钥Key
- `SERVER_SSH_KEY`: 服务器SSH私钥
- `SERVER_HOST`: 服务器IP地址
- `SERVER_USER`: 服务器用户名

## 📊 性能提升

| 场景 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 博客更新 | 15-20分钟 | 2-3分钟 | **85%** |
| 功能更新 | 20-30分钟 | 5-8分钟 | **75%** |

## 🌐 访问地址

部署完成后访问：https://dongboge.cn

## 🔍 故障排查

如遇问题，可使用诊断脚本：
```bash
chmod +x scripts/server-diagnostic.sh
./scripts/server-diagnostic.sh 服务器IP 用户名 SSH密钥路径