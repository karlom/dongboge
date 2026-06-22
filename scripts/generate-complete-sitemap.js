/**
 * 兼容旧命令的入口。权威实现统一在 modules/sitemap-generator.js，
 * 避免 sitemap 与站内路由分别维护两套 slug 规则。
 */
import { generateSitemap } from './modules/sitemap-generator.js';

export async function generateCompleteSitemap() {
    return generateSitemap();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    generateCompleteSitemap().catch((error) => {
        console.error(`❌ Sitemap 生成失败: ${error.message}`);
        process.exitCode = 1;
    });
}
