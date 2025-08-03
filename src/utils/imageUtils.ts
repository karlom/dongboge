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

    // 处理各种相对路径格式
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

    // 根据环境返回正确的路径
    // 在本地开发时，cdnUrl 会返回本地路径
    // 在远程部署时，cdnUrl 会返回CDN路径
    return cdnUrl(`/assets/${assetPath}`);
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