# 腾讯云CDN设置指南

本文档提供了将Astro博客与腾讯云CDN集成的详细步骤和常见问题解决方案。

## 目录

1. [基本架构](#基本架构)
2. [前置准备](#前置准备)
3. [CDN配置步骤](#cdn配置步骤)
4. [常见问题与解决方案](#常见问题与解决方案)
5. [性能优化建议](#性能优化建议)
6. [费用优化策略](#费用优化策略)

## 基本架构

我们的网站部署架构如下：

- **静态资源**：存储在腾讯云COS中，通过CDN分发
  - 字体文件
  - 图片资源
  - CSS和JavaScript文件
- **HTML文件**：部署在服务器上，直接通过服务器提供

这种分离式架构可以充分利用CDN的优势加速静态资源的加载，同时保持HTML内容的动态更新能力。

## 前置准备

在开始配置前，请确保您已经：

1. 注册了腾讯云账号
2. 创建了COS存储桶
3. 开通了CDN服务
4. 获取了访问密钥（SecretId和SecretKey）

## CDN配置步骤

### 1. 环境变量设置

在项目根目录创建`.env.production`文件，添加以下内容：

```
PUBLIC_CDN_URL=https://cdn.yourdomain.com
```

在GitHub Actions中，设置以下密钥：

- `TENCENT_SECRET_ID`：腾讯云API密钥ID
- `TENCENT_SECRET_KEY`：腾讯云API密钥Key
- `TENCENT_COS_BUCKET`：COS存储桶名称
- `CDN_DOMAIN`：CDN域名（不含协议前缀）

### 2. 配置CORS规则

我们的部署流程会自动设置CORS规则，确保字体文件可以正确加载。CORS规则包括：

- 允许所有域名访问（AllowedOrigins: ['*']）
- 允许GET、HEAD、PUT、POST、DELETE方法
- 允许所有请求头
- 预检请求有效期为86400秒（1天）

### 3. 增量上传脚本

我们使用增量上传脚本，只上传新增或修改的文件，减少CDN费用：

```bash
node scripts/incremental-upload.js
```

该脚本会：
- 计算文件MD5哈希值
- 与上次上传的文件比较
- 只上传发生变化的文件
- 设置合适的缓存控制头

## 常见问题与解决方案

### 依赖问题

**问题**：部署时出现`Error: Cannot find module 'strnum'`等依赖错误

**解决方案**：
1. 确保安装了所有必要的依赖：
   ```bash
   npm install cos-nodejs-sdk-v5 tencentcloud-sdk-nodejs-cdn strnum fast-xml-parser@4.2.5
   ```
2. 在GitHub Actions中，我们已经配置了自动安装这些依赖

### CORS错误

**问题**：字体文件加载时出现CORS错误

**解决方案**：
1. 确保`setup-cos-cors.js`脚本正确执行
2. 检查字体文件的URL是否使用了CDN域名
3. 确保在HTML中使用了`crossorigin`属性：
   ```html
   <link rel="preload" href="https://cdn.domain.com/fonts/font.woff" as="font" type="font/woff" crossorigin />
   ```

### 样式错乱问题

**问题**：部署后网站样式错乱

**解决方案**：
1. 检查CSS文件是否正确加载（使用浏览器开发者工具）
2. 确保`astro.config.mjs`中的配置正确
3. 验证`cdnConfig.ts`中的URL处理逻辑
4. 运行验证脚本检查资源加载情况：
   ```bash
   node scripts/verify-deployment.js
   ```

## 性能优化建议

1. **使用长期缓存**：
   - 静态资源设置`Cache-Control: max-age=31536000`（1年）
   - HTML文件设置较短的缓存时间

2. **预加载关键资源**：
   - 使用`<link rel="preload">`预加载字体和关键CSS
   - 考虑使用资源提示（如`prefetch`）优化导航

3. **图片优化**：
   - 使用WebP格式替代JPEG/PNG
   - 实现响应式图片，根据设备提供不同分辨率的图片

## 费用优化策略

1. **增量上传**：
   - 只上传新增或修改的文件，减少存储和请求费用
   - 维护上传清单文件`.upload-manifest.json`

2. **合理设置缓存**：
   - 长缓存时间减少回源请求
   - 使用版本化URL避免缓存问题

3. **定期清理**：
   - 定期清理长时间未使用的资源
   - 监控CDN使用情况，及时发现异常

4. **资源压缩**：
   - 启用Gzip/Brotli压缩
   - 压缩图片和其他媒体文件

---

如有任何问题，请参考[腾讯云CDN文档](https://cloud.tencent.com/document/product/228)或联系技术支持。