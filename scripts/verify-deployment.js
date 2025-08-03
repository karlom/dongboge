/**
 * 部署验证工具
 * 
 * 这个脚本用于验证网站部署是否成功，检查关键页面和资源是否可访问。
 * 
 * 使用方法:
 * export SITE_URL=https://dongboge.cn
 * export CDN_DOMAIN=cdn.dongboge.cn
 * node scripts/verify-deployment.js
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// 网站URL和CDN域名
const SITE_URL = process.env.SITE_URL || 'https://dongboge.cn';
const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.dongboge.cn';

// 要检查的页面
const pagesToCheck = [
    { path: '/', name: '首页' },
    { path: '/training-cases', name: '培训案例' },
    { path: '/services', name: '我的服务' },
    { path: '/blog', name: '博客' }
];

// 检查单个页面
async function checkPage(page) {
    const url = `${SITE_URL}${page.path}`;
    console.log(`\n检查页面: ${page.name} (${url})`);

    try {
        const response = await fetch(url);
        const status = response.status;
        const contentType = response.headers.get('content-type');

        console.log(`状态码: ${status}`);
        console.log(`内容类型: ${contentType || '未设置'}`);

        if (status === 200) {
            console.log('✅ 页面可访问');

            // 获取页面内容
            const html = await response.text();

            // 使用JSDOM解析HTML
            const dom = new JSDOM(html);
            const document = dom.window.document;

            // 检查CSS引用
            const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
            console.log(`\n找到 ${cssLinks.length} 个CSS引用:`);

            let allCssValid = true;
            for (const link of cssLinks) {
                const href = link.getAttribute('href');
                console.log(`- ${href}`);

                // 检查是否使用了CDN域名
                if (href.includes(CDN_DOMAIN)) {
                    console.log(`  ✅ 使用了CDN域名`);

                    // 检查CSS文件是否可访问
                    try {
                        const cssResponse = await fetch(href);
                        if (cssResponse.status === 200) {
                            console.log(`  ✅ CSS文件可访问`);
                        } else {
                            console.log(`  ❌ CSS文件不可访问，状态码: ${cssResponse.status}`);
                            allCssValid = false;
                        }
                    } catch (error) {
                        console.log(`  ❌ 请求CSS文件失败: ${error.message}`);
                        allCssValid = false;
                    }
                } else {
                    console.log(`  ❌ 未使用CDN域名`);
                    allCssValid = false;
                }
            }

            // 检查字体预加载
            const fontPreloads = document.querySelectorAll('link[rel="preload"][as="font"]');
            console.log(`\n找到 ${fontPreloads.length} 个字体预加载引用:`);

            let allFontsValid = true;
            for (const link of fontPreloads) {
                const href = link.getAttribute('href');
                console.log(`- ${href}`);

                // 检查是否使用了CDN域名
                if (href.includes(CDN_DOMAIN)) {
                    console.log(`  ✅ 使用了CDN域名`);

                    // 检查是否设置了crossorigin属性
                    if (link.hasAttribute('crossorigin')) {
                        console.log(`  ✅ 设置了crossorigin属性`);
                    } else {
                        console.log(`  ❌ 未设置crossorigin属性`);
                        allFontsValid = false;
                    }

                    // 检查字体文件是否可访问
                    try {
                        const fontResponse = await fetch(href);
                        if (fontResponse.status === 200) {
                            console.log(`  ✅ 字体文件可访问`);
                        } else {
                            console.log(`  ❌ 字体文件不可访问，状态码: ${fontResponse.status}`);
                            allFontsValid = false;
                        }
                    } catch (error) {
                        console.log(`  ❌ 请求字体文件失败: ${error.message}`);
                        allFontsValid = false;
                    }
                } else {
                    console.log(`  ❌ 未使用CDN域名`);
                    allFontsValid = false;
                }
            }

            // 检查图片引用
            const images = document.querySelectorAll('img');
            console.log(`\n找到 ${images.length} 个图片引用:`);

            let allImagesValid = true;
            for (const img of images) {
                const src = img.getAttribute('src');
                console.log(`- ${src}`);

                // 检查是否使用了CDN域名
                if (src.includes(CDN_DOMAIN)) {
                    console.log(`  ✅ 使用了CDN域名`);

                    // 检查图片文件是否可访问
                    try {
                        const imgResponse = await fetch(src);
                        if (imgResponse.status === 200) {
                            console.log(`  ✅ 图片文件可访问`);
                        } else {
                            console.log(`  ❌ 图片文件不可访问，状态码: ${imgResponse.status}`);
                            allImagesValid = false;
                        }
                    } catch (error) {
                        console.log(`  ❌ 请求图片文件失败: ${error.message}`);
                        allImagesValid = false;
                    }
                } else if (src.startsWith('data:')) {
                    console.log(`  ✅ 使用了内联数据URI`);
                } else {
                    console.log(`  ❌ 未使用CDN域名`);
                    allImagesValid = false;
                }
            }

            // 总结页面检查结果
            console.log('\n页面检查结果:');
            console.log(`CSS文件: ${allCssValid ? '✅ 全部正常' : '❌ 存在问题'}`);
            console.log(`字体文件: ${allFontsValid ? '✅ 全部正常' : '❌ 存在问题'}`);
            console.log(`图片文件: ${allImagesValid ? '✅ 全部正常' : '❌ 存在问题'}`);

            return {
                status: 'success',
                cssValid: allCssValid,
                fontsValid: allFontsValid,
                imagesValid: allImagesValid
            };
        } else {
            console.log(`❌ 页面不可访问，状态码: ${status}`);
            return { status: 'error', error: `状态码: ${status}` };
        }
    } catch (error) {
        console.error(`❌ 请求失败: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

// 主函数
async function main() {
    console.log(`\n===== 开始验证网站部署 =====`);
    console.log(`网站URL: ${SITE_URL}`);
    console.log(`CDN域名: ${CDN_DOMAIN}`);

    const results = {};

    // 检查所有页面
    for (const page of pagesToCheck) {
        results[page.name] = await checkPage(page);
    }

    // 总结所有页面的检查结果
    console.log(`\n===== 部署验证结果 =====`);
    let allValid = true;

    for (const [pageName, result] of Object.entries(results)) {
        console.log(`\n${pageName}:`);

        if (result.status === 'success') {
            const pageValid = result.cssValid && result.fontsValid && result.imagesValid;
            console.log(`状态: ${pageValid ? '✅ 正常' : '❌ 存在问题'}`);

            if (!pageValid) {
                allValid = false;
                if (!result.cssValid) console.log(`- CSS文件存在问题`);
                if (!result.fontsValid) console.log(`- 字体文件存在问题`);
                if (!result.imagesValid) console.log(`- 图片文件存在问题`);
            }
        } else {
            console.log(`状态: ❌ 错误 (${result.error})`);
            allValid = false;
        }
    }

    console.log(`\n总体结果: ${allValid ? '✅ 部署成功' : '❌ 部署存在问题'}`);
    console.log(`\n===== 部署验证完成 =====`);
}

// 运行主函数
main().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
});