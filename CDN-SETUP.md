# 腾讯云CDN配置指南

本文档详细说明如何将东波哥的个人网站与腾讯云CDN集成，以提高网站性能和访问速度。

## 目录

1. [前提条件](#前提条件)
2. [腾讯云CDN设置](#腾讯云cdn设置)
3. [项目配置](#项目配置)
4. [部署流程](#部署流程)
5. [常见问题](#常见问题)

## 前提条件

在开始配置之前，请确保您已经：

- 注册了腾讯云账号
- 开通了腾讯云对象存储（COS）服务
- 开通了腾讯云内容分发网络（CDN）服务
- 拥有访问密钥（SecretId 和 SecretKey）

## 腾讯云CDN设置

### 1. 创建存储桶

1. 登录腾讯云控制台，进入对象存储服务
2. 创建一个新的存储桶，例如 `dongboge-static`
3. 设置存储桶访问权限为"公有读私有写"
4. 记录存储桶名称和地域信息

### 2. 配置CDN加速

1. 在腾讯云控制台中，进入CDN管理页面
2. 添加加速域名，例如 `cdn.dongboge.cn`
3. 源站类型选择"对象存储（COS）"，并选择刚才创建的存储桶
4. 配置缓存规则：
   - 静态资源（如CSS、JS、图片）：缓存时间设置为7天
   - 字体文件：缓存时间设置为30天
5. 开启HTTPS，上传SSL证书
6. 配置CNAME解析，将您的CDN域名（如`cdn.dongboge.cn`）指向腾讯云分配的CNAME地址

## 项目配置

### 1. 环境变量设置

在项目根目录创建`.env`和`.env.production`文件：

```bash
# .env (开发环境)
PUBLIC_CDN_URL=''

# .env.production (生产环境)
PUBLIC_CDN_URL='https://你的CDN域名'  # 例如 https://cdn.dongboge.cn
```

### 2. GitHub Actions 密钥配置

在GitHub仓库的Settings > Secrets and variables > Actions中添加以下密钥：

- `TENCENT_SECRET_ID`: 腾讯云API密钥ID
- `TENCENT_SECRET_KEY`: 腾讯云API密钥
- `TENCENT_COS_BUCKET`: 腾讯云对象存储桶名称（例如：`dongboge-static-1234567890`）
- `CDN_DOMAIN`: CDN域名（例如：`cdn.dongboge.cn`）

## 部署流程

项目已配置自动化部署流程，当代码推送到main或master分支时：

1. GitHub Actions工作流会自动触发
2. 构建项目生成静态文件
3. 将静态资源（CSS、JS、图片、字体等）上传到腾讯云COS
4. 刷新CDN缓存
5. 将HTML和其他文件部署到Web服务器

### 手动部署

如需手动部署，可以执行以下命令：

```bash
# 安装腾讯云CLI
pip install tccli

# 配置腾讯云CLI
tccli configure set secretId 你的SecretId
tccli configure set secretKey 你的SecretKey
tccli configure set region ap-guangzhou

# 构建项目
npm run build

# 上传静态资源到COS
tccli cos sync dist/assets cos://你的存储桶名称/assets --delete
tccli cos sync dist/fonts cos://你的存储桶名称/fonts --delete

# 刷新CDN缓存
tccli cdn PurgePathCache --cli-unfold-argument --Paths https://你的CDN域名/assets/ https://你的CDN域名/fonts/ --FlushType flush
```

## 常见问题

### 1. 资源路径问题

如果发现某些资源未正确加载，请检查：
- CDN配置文件中的路径是否正确
- 是否所有需要CDN加速的资源都已使用`cdnUrl`函数包装

### 2. CORS问题

如果遇到跨域资源共享(CORS)问题：
1. 在腾讯云COS控制台中，选择您的存储桶
2. 进入"安全管理" > "跨域访问CORS设置"
3. 添加规则，允许您的网站域名访问

### 3. 缓存刷新

当更新静态资源后，可能需要手动刷新CDN缓存：
1. 在腾讯云CDN控制台中，选择"缓存刷新"
2. 选择"目录刷新"，输入需要刷新的目录路径（如`/assets/`）
3. 提交刷新请求

### 4. 性能监控

建议定期检查CDN性能：
1. 在腾讯云CDN控制台中，选择"统计分析"
2. 查看访问量、带宽、命中率等指标
3. 根据数据调整CDN配置以优化性能