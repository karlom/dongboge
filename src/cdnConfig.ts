// CDN配置
// 从环境变量中获取CDN URL
export const CDN_URL = import.meta.env.PUBLIC_CDN_URL || '';

// 生成CDN路径的辅助函数
export function cdnUrl(path: string): string {
    // 确保路径以/开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 如果CDN_URL为空（本地开发环境），则使用相对路径
    // 否则（生产环境）使用CDN URL
    return CDN_URL ? `${CDN_URL}${normalizedPath}` : normalizedPath;
}
