// CDN配置
// 从环境变量中获取CDN URL
export const CDN_URL = import.meta.env.PUBLIC_CDN_URL || '';

// 生成CDN路径的辅助函数
export function cdnUrl(path: string): string {
    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${CDN_URL}${normalizedPath}`;
}