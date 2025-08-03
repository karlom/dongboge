# 腾讯云CDN配置指南

本文档详细说明如何将东波哥的个人网站与腾讯云CDN集成，以提高网站性能和访问速度。

## 目录

1. [前提条件](#前提条件)
2. [腾讯云COS配置](#腾讯云cos配置)
3. [腾讯云CDN配置](#腾讯云cdn配置)
4. [GitHub Actions配置](#github-actions配置)
5. [本地开发配置](#本地开发配置)
6. [测试CDN配置](#测试cdn配置)
7. [常见问题](#常见问题)

## 前提条件

- 腾讯云账号
- 已购买域名（用于CDN加速）
- 基本的命令行操作知识

## 腾讯云COS配置

1. **创建存储桶**

   登录[腾讯云控制台](https://console.cloud.tencent.com/)，进入对象存储COS服务。

   - 点击"创建存储桶"
   - 填写存储桶名称（例如：`dongboge-static-1234567890`）
   - 选择所属地域（建议选择与服务器相同的地域，如"广州"）
   - 访问权限选择"公有读私有写"
   - 其他选项保持默认
   - 点击"确定"创建存储桶

2. **获取访问密钥**

   - 访问[访问密钥](https://console.cloud.tencent.com/cam/capi)页面
   - 创建或查看你的SecretId和SecretKey
   - **注意**：建议创建子用户并授予最小权限，遵循最小权限原则

## 腾讯云CDN配置

1. **添加CDN加速域名**

   进入[CDN控制台](https://console.cloud.tencent.com/cdn)。

   - 点击"域名管理" > "添加域名"
   - 域名填写你的CDN域名（例如：`cdn.dongboge.cn`）
   - 源站类型选择"对象存储（COS）"
   - 选择之前创建的COS存储桶
   - 加速区域根据需求选择
   - 点击"确定"提交

2. **配置CNAME**

   - 在域名提供商处添加CNAME记录
   - 记录类型：CNAME
   - 主机记录：cdn（或你设置的二级域名前缀）
   - 记录值：CDN控制台提供的CNAME地址
   - TTL：建议设置为600秒

3. **配置缓存规则**

   在CDN域名管理页面：

   - 点击"缓存配置"
   - 添加缓存规则：
     - 对于静态资源（如CSS、JS、图片等），设置较长的缓存时间（如7天）
     - 对于字体文件，设置较长的缓存时间（如30天）
   - 点击"保存"应用规则

## GitHub Actions配置

1. **添加GitHub Secrets**

   在GitHub仓库中添加以下Secrets：

   - `TENCENT_SECRET_ID`：腾讯云API密钥ID
   - `TENCENT_SECRET_KEY`：腾讯云API密钥
   - `TENCENT_COS_BUCKET`：腾讯云对象存储桶名称（不包含`-1234567890`部分）
   - `CDN_DOMAIN`：CDN域名（例如：`cdn.dongboge.cn`）

2. **部署脚本已配置**

   `.github/workflows/deploy.yml`文件已配置为：
   - 构建项目
   - 使用Node.js SDK上传静态资源到腾讯云COS
   - 刷新CDN缓存
   - 部署HTML文件到服务器

## 本地开发配置

1. **环境变量配置**

   - 复制`.env.example`文件为`.env.local`
   - 在`.env.local`中设置`PUBLIC_CDN_URL=''`（本地开发不使用CDN）
   - 确保`.env.production`中设置了正确的CDN域名

2. **本地开发命令**

   ```bash
   npm run dev
   ```

   本地开发时不会使用CDN，所有资源都从本地加载。

## 测试CDN配置

1. **使用测试脚本**

   ```bash
   node scripts/test-cdn.js
   ```

   此脚本会测试CDN是否正常工作，检查常用资源是否可以通过CDN访问。

2. **手动测试**

   - 访问你的网站
   - 打开浏览器开发者工具
   - 检查网络请求，确认静态资源是否从CDN加载

## 常见问题

1. **CDN资源404错误**
   - 检查COS存储桶中是否有对应文件
   - 确认CNAME记录是否正确配置
   - 检查CDN域名状态是否为"已启动"

2. **CDN缓存未更新**
   - 手动刷新CDN缓存
   - 在CDN控制台中选择"刷新预热" > "URL刷新"
   - 输入需要刷新的URL路径

3. **上传到COS失败**
   - 检查SecretId和SecretKey是否正确
   - 确认存储桶名称是否正确
   - 检查是否有足够的权限

4. **本地开发时图片显示异常**
   - 确认`.env.local`中设置了`PUBLIC_CDN_URL=''`
   - 重启开发服务器

如有其他问题，请参考[腾讯云COS文档](https://cloud.tencent.com/document/product/436)和[腾讯云CDN文档](https://cloud.tencent.com/document/product/228)。