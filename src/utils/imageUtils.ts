import { cdnUrl } from "../cdnConfig";

/**
 * 处理图片路径，将相对路径转换为CDN路径
 * 
 * @param imagePath 原始图片路径
 * @returns 处理后的图片路径
 */
export function processImagePath(imagePath: string): string {
    // 如果是完整URL或者数据URL，直接返回
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
        return imagePath;
    }

    // 处理相对路径
    // 博客文章中的图片通常使用 '../../assets/xxx.jpg' 格式
    if (imagePath.includes('../../assets/')) {
        // 将 '../../assets/' 替换为 '/assets/'
        const normalizedPath = imagePath.replace('../../assets/', '/assets/');
        return cdnUrl(normalizedPath);
    }
    
    // 处理 '../assets/' 格式的路径
    if (imagePath.includes('../assets/')) {
        // 将 '../assets/' 替换为 '/assets/'
        const normalizedPath = imagePath.replace('../assets/', '/assets/');
        return cdnUrl(normalizedPath);
    }

    // 处理以 / 开头的路径
    if (imagePath.startsWith('/')) {
        return cdnUrl(imagePath);
    }

    // 处理 'assets/' 开头的路径
    if (imagePath.startsWith('assets/')) {
        return cdnUrl(`/${imagePath}`);
    }

    // 其他情况，假设是相对于根目录的路径
    return cdnUrl(`/${imagePath}`);
}
