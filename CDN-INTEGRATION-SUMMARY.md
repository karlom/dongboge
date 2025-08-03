# CDN集成总结

本文档总结了将网站与腾讯云CDN集成的所有更改和配置步骤。

## 1. 配置文件和环境变量

### CDN配置文件
我们创建了`src/cdnConfig.ts`文件，用于处理CDN URL：
```typescript
// CDN配置
export const CDN_URL = import.meta.env.PUBLIC_CDN_URL || '';

// 生成CDN路径的辅助函数
export function cdnUrl(path: string): string {
    // 如果路径是完整的URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 如果CDN_URL为空，返回相对路径
    if (!CDN_URL) {
        return normalizedPath;
    }

    // 确保CDN_URL不包含协议前缀，避免双重协议问题
    let cdnBase = CDN_URL;
    if (cdnBase.startsWith('https://')) {
        cdnBase = cdnBase.substring(8); // 移除 'https://'
    } else if (cdnBase.startsWith('http://')) {
        cdnBase = cdnBase.substring(7); // 移除 'http://'
    }

    // 返回CDN路径，确保使用https协议
    return `https://${cdnBase}${normalizedPath}`;
}
```

### 环境变量
在`.env.production`文件中设置CDN URL：
```
PUBLIC_CDN_URL=cdn.dongboge.cn
```

## 2. 组件修改

### BaseHead.astro
修改了`BaseHead.astro`组件，使用`cdnUrl`函数加载字体文件和图标：
```astro
<link rel="icon" type="image/png" href={cdnUrl("/Favicon.png")} />

<!-- Font preloads -->
<link
    rel="preload"
    href={cdnUrl("/fonts/atkinson-regular.woff")}
    as="font"
    type="font/woff"
    crossorigin
/>
<link
    rel="preload"
    href={cdnUrl("/fonts/atkinson-bold.woff")}
    as="font"
    type="font/woff"
    crossorigin
/>
```

### OptimizedImage.astro
创建了`OptimizedImage.astro`组件，用于优化图片加载：
```astro
---
import { processImagePath } from "../utils/imageUtils";
import { Image } from "astro:assets";

interface Props {
    src: any; // 可以是字符串路径或图像对象
    alt: string;
    class?: string;
    width?: number;
    height?: number;
    title?: string;
    loading?: "lazy" | "eager" | null | undefined;
}

const {
    src,
    alt,
    class: className,
    width,
    height,
    title,
    loading,
} = Astro.props;

// 检查src是否为字符串
const isStringPath = typeof src === "string";
const optimizedSrc = isStringPath ? processImagePath(src) : src;
---

<div class="image-wrapper" style="text-align: center; margin: 0 auto;">
    {
        isStringPath ? (
            <img
                src={optimizedSrc}
                alt={alt}
                class={className}
                width={width}
                height={height}
                title={title}
                loading={loading}
                style="display: block; margin: 0 auto; max-width: 100%;"
            />
        ) : (
            <Image
                src={optimizedSrc}
                alt={alt}
                class={className}
                width={width || 800}
                height={height || 600}
                title={title}
                style="display: block; margin: 0 auto; max-width: 100%;"
            />
        )
    }
</div>
```

## 3. 样式修改

### global.css
修改了`global.css`文件，使用相对路径加载字体文件：
```css
/* 字体文件使用相对路径加载，CDN会通过BaseHead.astro中的预加载处理 */
@font-face {
  font-family: "Atkinson";
  src: url("/fonts/atkinson-regular.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Atkinson";
  src: url("/fonts/atkinson-bold.woff") format("woff");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

## 4. 部署脚本

### upload-to-cos.js
创建了`scripts/upload-to-cos.js`脚本，用于将静态资源上传到腾讯云COS：
- 支持上传`assets`、`fonts`和`images`目录
- 添加了重试机制和错误处理
- 为上传的文件设置了CORS头和缓存控制
- 上传完成后刷新CDN缓存

### setup-cos-cors.js
创建了`scripts/setup-cos-cors.js`脚本，用于设置腾讯云COS存储桶的CORS规则：
```javascript
// 设置CORS规则
await new Promise((resolve, reject) => {
    cos.putBucketCors({
        Bucket,
        Region,
        CORSRules: [
            {
                AllowedOrigins: ['*'], // 允许所有域名访问
                AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'], // 允许的HTTP方法
                AllowedHeaders: ['*'], // 允许所有请求头
                ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Disposition', 'x-cos-request-id'], // 暴露的响应头
                MaxAgeSeconds: 86400 // 预检请求的有效期，单位为秒
            }
        ]
    }, (err, data) => {
        // ...
    });
});
```

### test-cdn.js
创建了`scripts/test-cdn.js`脚本，用于测试CDN配置是否正确：
- 测试字体文件、图片等资源是否可以正常访问
- 检查CORS头和缓存控制头是否正确设置

## 5. GitHub Actions工作流

修改了`.github/workflows/deploy.yml`文件，添加了以下步骤：
1. 设置腾讯云COS存储桶CORS规则
2. 上传静态资源到腾讯云COS
3. 部署HTML和其他文件到服务器（排除assets、fonts和images目录）

```yaml
- name: 设置腾讯云COS存储桶CORS规则
  run: |
    echo "设置腾讯云COS存储桶CORS规则..."
    # 设置环境变量
    export TENCENT_SECRET_ID=${{ secrets.TENCENT_SECRET_ID }}
    export TENCENT_SECRET_KEY=${{ secrets.TENCENT_SECRET_KEY }}
    export TENCENT_COS_BUCKET=${{ secrets.TENCENT_COS_BUCKET }}
    export TENCENT_COS_REGION=ap-guangzhou
    
    # 运行CORS设置脚本
    node scripts/setup-cos-cors.js
    
- name: 上传静态资源到腾讯云COS
  run: |
    echo "上传静态资源到腾讯云COS..."
    # 设置环境变量
    export TENCENT_SECRET_ID=${{ secrets.TENCENT_SECRET_ID }}
    export TENCENT_SECRET_KEY=${{ secrets.TENCENT_SECRET_KEY }}
    export TENCENT_COS_BUCKET=${{ secrets.TENCENT_COS_BUCKET }}
    export TENCENT_COS_REGION=ap-guangzhou
    # 确保CDN_DOMAIN不包含协议前缀
    export CDN_DOMAIN=$(echo ${{ secrets.CDN_DOMAIN }} | sed 's|^https://||' | sed 's|^http://||')
    
    # 运行上传脚本
    node scripts/upload-to-cos.js
    
- name: 部署HTML和其他文件到服务器
  uses: burnett01/rsync-deployments@6.0.0
  with:
    switches: -avzr --delete --exclude="assets/" --exclude="fonts/" --exclude="images/"
    path: dist/
    remote_path: /var/www/dongboge
    remote_host: ${{ secrets.HOST }}
    remote_user: ${{ secrets.USERNAME }}
    remote_key: ${{ secrets.SSH_PRIVATE_KEY }}
    remote_key_pass: ${{ secrets.SSH_PASSPHRASE }}
```

## 6. 腾讯云配置

### 对象存储（COS）
1. 创建存储桶，设置为公共读私有写
2. 配置CORS规则，允许所有域名访问
3. 设置缓存控制，提高资源加载速度

### CDN
1. 添加加速域名（如`cdn.dongboge.cn`）
2. 设置源站为腾讯云COS存储桶
3. 配置缓存规则，提高资源加载速度
4. 配置HTTPS证书，确保安全访问

## 7. GitHub Secrets配置

在GitHub仓库的Secrets中设置以下变量：
- `TENCENT_SECRET_ID`：腾讯云API密钥ID
- `TENCENT_SECRET_KEY`：腾讯云API密钥
- `TENCENT_COS_BUCKET`：腾讯云COS存储桶名称
- `CDN_DOMAIN`：CDN域名（如`cdn.dongboge.cn`）

## 8. 测试和验证

使用`scripts/test-cdn.js`脚本测试CDN配置是否正确：
```bash
export CDN_DOMAIN=cdn.dongboge.cn
node scripts/test-cdn.js
```

## 9. 故障排除

如果遇到CORS错误，请检查：
1. 腾讯云COS存储桶的CORS规则是否正确设置
2. 上传脚本中是否正确设置了CORS头
3. CDN是否正确配置了CORS规则

如果遇到资源加载错误，请检查：
1. CDN域名是否正确解析
2. 资源是否已正确上传到腾讯云COS
3. CDN缓存是否已刷新