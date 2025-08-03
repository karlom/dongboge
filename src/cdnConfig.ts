// CDN配置 - 根据环境返回不同的URL
export const CDN_URL = 'https://cdn.dongboge.cn';

/**
 * 生成路径的辅助函数
 * 本地开发：返回本地路径
 * 远程部署：返回CDN路径
 */
export function cdnUrl(path: string): string {
    // 如果路径是完整的URL，直接返回
    if (path.startsWith('http')) {
        return path;
    }

    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 检查是否为开发环境
    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

    if (isDev) {
        // 本地开发环境：返回本地路径
        // 对于assets目录下的文件，需要使用/src/assets/路径
        if (normalizedPath.startsWith('/assets/')) {
            return normalizedPath.replace('/assets/', '/src/assets/');
        }
        // 对于public目录下的文件（如/images/），直接返回路径
        if (normalizedPath.startsWith('/images/')) {
            return normalizedPath;
        }
        return normalizedPath;
    } else {
        // 生产环境：返回CDN路径
        return `${CDN_URL}${normalizedPath}`;
    }
}

/**
 * 调试函数，用于检查CDN URL是否正确
 * 在控制台输出详细信息，帮助排查问题
 */
export function debugCdnUrl(path: string): string {
    const result = cdnUrl(path);
    console.log(`[CDN调试] 原始路径: ${path} => CDN路径: ${result}`);
    return result;
}
