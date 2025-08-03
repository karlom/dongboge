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
