# Assets映射功能说明

## 功能概述

这个功能解决了博客文章中引用的图片在CDN上的访问问题。当Astro构建时，`src/assets/` 目录下的图片会被处理并放到 `_astro/` 目录下（带hash的文件名），但博客文章中的 `heroImage` 引用的是 `assets/` 路径。

## 工作原理

1. **构建阶段**：
   - `src/assets/success.jpg` → `dist/_astro/success.DnpSl9pE.jpg`

2. **CDN同步阶段**：
   - 上传 `_astro/success.DnpSl9pE.jpg` 到CDN
   - **自动创建映射**：复制一份到 `assets/success.DnpSl9pE.jpg`

3. **访问阶段**：
   - 博客引用：`heroImage: "../../assets/success.jpg"`
   - 实际访问：`https://cdn.dongboge.cn/assets/success.DnpSl9pE.jpg`

## 实现细节

### 修改的文件

- `scripts/modules/cdn-sync.js` - 添加了assets映射逻辑
- `.gitignore` - 忽略本地清单文件

### 新增的功能

1. **`createAssetsMapping()` 函数**：
   - 检测上传的文件中的 `_astro/` 图片
   - 使用COS的 `putObjectCopy` API创建映射
   - 维护映射记录避免重复操作

2. **映射记录文件**：
   - `.assets-mapping-manifest.json` - 记录已创建的映射
   - 避免重复创建相同的映射

### 工作流程

```
上传文件到CDN
    ↓
检测_astro目录下的图片文件
    ↓
检查映射记录，避免重复
    ↓
使用putObjectCopy创建assets映射
    ↓
更新映射记录
```

## 使用方式

功能已集成到现有的 `simple-deploy` 工作流中，无需额外配置。当有图片文件上传到CDN时，会自动创建assets映射。

## 日志输出

部署时会看到类似的日志：

```
🔗 检查是否需要创建assets映射...
📋 发现 2 个_astro图片文件需要检查映射
  📤 创建映射: _astro/success.DnpSl9pE.jpg -> assets/success.DnpSl9pE.jpg
  ✅ 映射创建成功: assets/success.DnpSl9pE.jpg
✅ 创建了 1 个assets映射
```

## 故障排除

1. **映射创建失败**：检查COS权限和网络连接
2. **重复创建映射**：检查 `.assets-mapping-manifest.json` 文件是否正常
3. **图片仍然无法访问**：检查CDN缓存，可能需要等待缓存刷新

## 检查和维护

### 检查映射状态

```bash
npm run assets:check
# 或者
node scripts/check-cdn-assets-mapping.js
```

这个命令会：

- 列出CDN上 `_astro/` 目录下的所有图片文件
- 检查对应的 `assets/` 映射是否存在
- 显示详细的映射状态报告
- 识别缺失的映射

### 修复缺失的映射

```bash
npm run assets:fix
# 或者
node scripts/fix-missing-assets-mapping.js
```

这个命令会：

- 自动为缺失的映射创建COS复制
- 更新本地映射清单
- 显示修复结果统计

### 测试功能

```bash
npm run assets:test
# 或者
node scripts/test-assets-mapping.js
```

## 维护建议

1. **定期检查**：建议定期运行 `npm run assets:check` 检查映射状态
2. **部署后验证**：每次部署后可以运行检查命令确认新图片已正确映射
3. **清单备份**：`.assets-mapping-manifest.json` 文件包含重要的映射记录，建议定期备份
