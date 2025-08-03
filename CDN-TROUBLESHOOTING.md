# CDN集成问题排查指南

## 问题描述

网站在本地环境正常，但部署到生产环境后，首页、培训案例、我的服务等页面的样式错乱，只有页眉正常显示。

## 系统分析

### 1. 资源加载路径问题

在Astro项目中，资源路径处理涉及多个层面：

1. **构建配置层**：`astro.config.mjs`中的`vite.base`设置
2. **CDN路径处理层**：`cdnConfig.ts`中的URL处理逻辑
3. **组件引用层**：各组件中如何引用资源

### 2. 资源类型分析

需要正确加载的关键资源：

- **CSS文件**：Tailwind生成的样式
- **字体文件**：Atkinson字体
- **图片文件**：网站图片

### 3. 部署流程分析

当前部署流程：
- 静态资源上传到CDN
- HTML和其他文件部署到服务器
- 两者需要正确配合

## 根本原因

经过分析，问题的根本原因是：

1. **路径不一致**：构建时的资源路径与实际访问路径不匹配
2. **CDN配置问题**：资源在CDN上的路径与HTML中引用的路径不一致
3. **Vite构建配置**：`vite.base`设置与实际CDN路径不匹配

## 系统解决方案

### 步骤1：统一资源路径策略

确保所有配置中使用一致的CDN URL格式：

```javascript
// 在所有地方统一使用
const CDN_URL = 'https://cdn.dongboge.cn';
```

### 步骤2：修复构建配置

在`astro.config.mjs`中正确设置：

```javascript
export default defineConfig({
  site: 'https://www.dongboge.cn',
  vite: {
    // 确保构建时资源使用正确的基础路径
    base: 'https://cdn.dongboge.cn/',
    build: {
      // 生成单一CSS文件，避免路径问题
      cssCodeSplit: false
    }
  }
});
```

### 步骤3：简化CDN URL处理

修改`cdnConfig.ts`，使用简单直接的方法：

```typescript
// 硬编码CDN URL，避免环境变量问题
export const CDN_URL = 'https://cdn.dongboge.cn';

export function cdnUrl(path) {
  // 如果已经是完整URL，直接返回
  if (path.startsWith('http')) return path;
  
  // 确保路径以/开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 直接返回完整URL
  return `${CDN_URL}${normalizedPath}`;
}
```

### 步骤4：修复字体加载

在`global.css`中使用绝对URL：

```css
@font-face {
  font-family: "Atkinson";
  src: url("https://cdn.dongboge.cn/fonts/atkinson-regular.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### 步骤5：验证资源可访问性

创建并运行检查脚本，确保所有资源可访问：

```bash
node scripts/check-cdn-assets.js
```

## 验证方法

1. 本地构建并检查生成的HTML文件中的资源路径
2. 检查CDN上的资源是否可访问
3. 部署后使用浏览器开发者工具检查资源加载情况

## 预防措施

1. 创建自动化测试，验证资源路径
2. 在CI/CD流程中添加资源可访问性检查
3. 实施更严格的代码审查流程