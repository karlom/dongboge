// CDN配置 - 硬编码CDN URL，避免环境变量问题
export const CDN_URL = 'https://cdn.dongboge.cn';

/**
 * 生成CDN路径的辅助函数
 * 简化版本，直接使用硬编码的CDN URL
 */
export function cdnUrl(path: string): string {
    // 如果路径是完整的URL，直接返回
    if (path.startsWith('http')) {
        return path;
    }

    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 直接返回完整URL
    return `${CDN_URL}${normalizedPath}`;
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
