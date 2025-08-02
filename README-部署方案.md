# 🚀 东博哥博客自动化部署方案

## 📖 方案概述

本方案实现了从本地编写Markdown文章到自动部署至腾讯云服务器的完整流程，支持通过 `https://www.dongboge.cn` 访问。

### 🏗️ 技术架构

```
本地开发 → GitHub仓库 → GitHub Actions → 腾讯云服务器 → Nginx → 域名访问
```

## 🎯 核心特性

- ✅ **一键部署**：执行脚本即可完成部署
- ✅ **自动化CI/CD**：推送代码自动触发部署
- ✅ **HTTPS支持**：自动配置SSL证书
- ✅ **性能优化**：Nginx静态文件缓存
- ✅ **安全配置**：防火墙和安全头设置

## 📋 部署步骤

### 第一步：服务器环境配置

```bash
# 1. 上传配置脚本到服务器
scp deploy/server-setup.sh root@你的服务器IP:/root/

# 2. 登录服务器执行配置
ssh root@你的服务器IP
chmod +x server-setup.sh
./server-setup.sh
```

### 第二步：GitHub配置

1. **推送代码到GitHub仓库**
2. **配置GitHub Secrets**：
   - `HOST`: 服务器IP地址
   - `USERNAME`: 服务器用户名
   - `PRIVATE_KEY`: 服务器SSH私钥
   - `PORT`: SSH端口（通常是22）

### 第三步：SSL证书配置

```bash
# 在服务器上执行
./deploy/ssl-setup.sh
```

### 第四步：域名解析

在域名管理面板添加DNS记录：
- `dongboge.cn` → 服务器IP
- `www.dongboge.cn` → 服务器IP

### 第五步：一键部署

```bash
# 在本地项目目录执行
./deploy/one-click-deploy.sh
```

## 📁 文件结构

```
my-blog/
├── .github/workflows/
│   └── deploy.yml              # GitHub Actions自动部署配置
├── deploy/
│   ├── nginx.conf              # Nginx服务器配置
│   ├── server-setup.sh         # 服务器环境一键配置脚本
│   ├── ssl-setup.sh            # SSL证书自动配置脚本
│   └── one-click-deploy.sh     # 本地一键部署脚本
├── src/content/posts/          # 博客文章目录
├── 部署指南.md                 # 详细部署文档
└── README-部署方案.md          # 本文档
```

## 🔄 日常使用

1. **编写文章**：在 `src/content/posts/` 创建 `.md` 文件
2. **本地预览**：`npm run dev`
3. **一键部署**：`./deploy/one-click-deploy.sh`

## 🛠️ 核心配置说明

### GitHub Actions工作流
- 监听main分支推送事件
- 自动安装依赖、构建项目
- 通过SSH连接服务器部署

### Nginx配置特性
- HTTP自动重定向HTTPS
- 静态资源缓存优化
- 安全头配置
- Astro路由支持

### 服务器环境
- Ubuntu/Debian系统
- Node.js 18
- Nginx Web服务器
- Let's Encrypt SSL证书
- UFW防火墙配置

## 🔧 故障排除

### 常见问题

1. **部署失败**
   - 检查GitHub Secrets配置
   - 验证SSH密钥权限
   - 查看Actions执行日志

2. **网站无法访问**
   - 确认DNS解析生效
   - 检查防火墙端口开放
   - 验证Nginx配置语法

3. **SSL证书问题**
   - 重新执行ssl-setup.sh
   - 确认域名解析正确
   - 检查证书文件权限

### 手动部署命令

```bash
# 服务器上手动部署
cd /var/www/dongboge
git pull origin main
npm ci
npm run build
sudo systemctl reload nginx
```

## 📊 性能优化建议

1. **启用Gzip压缩**
2. **配置CDN加速**
3. **图片资源优化**
4. **数据库查询优化**

## 🔒 安全加固建议

1. **定期系统更新**
2. **配置fail2ban**
3. **使用非标准SSH端口**
4. **定期备份数据**

## 🎉 完成！

部署完成后，你的博客将通过以下地址访问：
- **主域名**：https://www.dongboge.cn
- **备用域名**：https://dongboge.cn

现在你可以专注于内容创作，部署过程完全自动化！

---

💡 **提示**：详细的配置说明请参考 `部署指南.md` 文件。