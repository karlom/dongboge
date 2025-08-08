import { cdnUrl } from '../cdnConfig';

/**
 * 处理图片路径，根据环境返回正确的URL
 * 本地开发：返回本地路径
 * 远程部署：返回CDN路径
 */
export function processImagePath(imagePath: string): string {
    // 如果已经是完整的URL，直接返回
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // 处理各种相对路径格式，提取原始文件名
    let assetPath = '';

    if (imagePath.startsWith('assets-')) {
        // assets-filename.jpg -> filename.jpg
        assetPath = imagePath.replace('assets-', '');
    } else if (imagePath.startsWith('./src/assets/')) {
        // ./src/assets/filename.jpg -> filename.jpg
        assetPath = imagePath.replace('./src/assets/', '');
    } else if (imagePath.startsWith('../../assets/')) {
        // ../../assets/filename.jpg -> filename.jpg
        assetPath = imagePath.replace('../../assets/', '');
    } else if (imagePath.startsWith('../assets/')) {
        // ../assets/filename.jpg -> filename.jpg
        assetPath = imagePath.replace('../assets/', '');
    } else if (imagePath.startsWith('/assets/')) {
        // /assets/filename.jpg -> filename.jpg
        assetPath = imagePath.replace('/assets/', '');
    } else if (!imagePath.includes('/')) {
        // 直接是文件名：filename.jpg
        assetPath = imagePath;
    } else {
        // 其他情况，尝试提取文件名
        assetPath = imagePath.split('/').pop() || imagePath;
    }

    // 检查是否为开发环境
    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

    if (isDev) {
        // 本地开发环境：返回本地路径
        if (assetPath) {
            return `/src/assets/${assetPath}`;
        }
        return imagePath;
    } else {
        // 生产环境：在CDN上传时，我们会将文件同时上传到两个位置
        // 1. /_astro/filename.hash.jpg (Astro构建后的实际位置)
        // 2. /assets/filename.jpg (兼容性位置)
        // 这里我们使用兼容性位置，确保图片能正常显示
        return cdnUrl(`/assets/${assetPath}`);
    }
}

/**
 * 获取图片的本地开发路径
 */
export function getLocalImagePath(filename: string): string {
    return `/src/assets/${filename}`;
}

/**
 * 获取图片的CDN路径
 */
export function getCdnImagePath(filename: string): string {
    return `https://cdn.dongboge.cn/assets/${filename}`;
}