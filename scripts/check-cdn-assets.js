/**
 * CDN资源检查工具
 * 
 * 这个脚本用于检查CDN上的资源是否可访问，并验证其内容和头信息。
 * 它可以帮助诊断CDN配置问题，确保所有关键资源都能正确加载。
 * 
 * 使用方法:
 * export CDN_DOMAIN=cdn.dongboge.cn
 * node scripts/check-cdn-assets.js
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// CDN域名
const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.dongboge.cn';

// 要检查的关键资源
const criticalAssets = [
    // CSS文件 - 检查构建后的实际文件名
    { path: '/assets/index.*.css', type: 'css', pattern: true },
    // 字体文件
    { path: '/fonts/atkinson-regular.woff', type: 'font' },
    { path: '/fonts/atkinson-bold.woff', type: 'font' },
    // 图片文件
    { path: '/images/hero1.png', type: 'image' },
    { path: '/Favicon.png', type: 'image' }
];

// 检查单个资源
async function checkAsset(asset) {
    const isPattern = asset.pattern === true;
    let url = `https://${CDN_DOMAIN}${asset.path}`;
    let actualPath = asset.path;
    
    // 如果是模式匹配，需要先找到实际文件
    if (isPattern) {
        try {
            const pattern = new RegExp(asset.path.replace(/\./g, '\\.').replace(/\*/g, '[^/]+'));
            const distDir = path.join(projectRoot, 'dist');
            const files = await fs.readdir(distDir, { recursive: true });
            
            // 查找匹配的文件
            const matchedFile = files.find(file => pattern.test('/' + file));
            if (matchedFile) {
                actualPath = '/' + matchedFile;
                url = `https://${CDN_DOMAIN}/${matchedFile}`;
                console.log(`找到匹配文件: ${matchedFile}`);
            } else {
                console.log(`❌ 未找到匹配 ${asset.path} 的文件`);
                return;
            }
        } catch (error) {
            console.error(`❌ 查找文件失败: ${error.message}`);
            return;
        }
    }
    
    console.log(`\n检查资源: ${url}`);
    console.log(`资源类型: ${asset.type}`);

    try {
        const response = await fetch(url);
        const status = response.status;
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const cacheControl = response.headers.get('cache-control');
        const corsHeaders = {
            'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
            'Access-Control-Allow-Methods': response.headers.get('access-control-allow-methods'),
            'Access-Control-Allow-Headers': response.headers.get('access-control-allow-headers')
        };

        console.log(`状态码: ${status}`);
        console.log(`内容类型: ${contentType || '未设置'}`);
        console.log(`内容大小: ${contentLength || '未知'} 字节`);
        console.log(`缓存控制: ${cacheControl || '未设置'}`);
        console.log(`CORS头信息: ${JSON.stringify(corsHeaders)}`);

        if (status === 200) {
            console.log('✅ 资源可访问');
            
            // 根据资源类型进行特定检查
            if (asset.type === 'css') {
                const text = await response.text();
                const hash = createHash('md5').update(text).digest('hex');
                console.log(`CSS文件哈希: ${hash.substring(0, 8)}`);
                
                if (text.includes('tailwind') || text.includes('.bg-')) {
                    console.log('✅ CSS文件包含Tailwind样式');
                } else {
                    console.log('❌ CSS文件不包含Tailwind样式');
                }
                
                // 检查CSS文件大小
                const sizeKB = (text.length / 1024).toFixed(2);
                console.log(`CSS文件大小: ${sizeKB} KB`);
                
                // 保存CSS内容到临时文件以便检查
                const tempFile = path.join(projectRoot, 'temp-css-content.txt');
                await fs.writeFile(tempFile, text);
                console.log(`CSS内容已保存到: ${tempFile}`);
            }
            
            // 检查字体文件
            if (asset.type === 'font') {
                // 检查CORS头信息
                if (corsHeaders['Access-Control-Allow-Origin'] === '*' || 
                    corsHeaders['Access-Control-Allow-Origin']?.includes('dongboge.cn')) {
                    console.log('✅ 字体文件CORS配置正确');
                } else {
                    console.log('❌ 字体文件CORS配置不正确');
                }
            }
        } else {
            console.log(`❌ 资源不可访问，状态码: ${status}`);
        }
    } catch (error) {
        console.error(`❌ 请求失败: ${error.message}`);
    }
}

// 检查HTML文件中的资源引用
async function checkHtmlReferences() {
    console.log('\n===== 检查HTML文件中的资源引用 =====');
    
    try {
        // 读取index.html文件
        const indexHtmlPath = path.join(projectRoot, 'dist', 'index.html');
        const content = await fs.readFile(indexHtmlPath, 'utf-8');
        
        // 检查CSS引用
        const cssRefs = content.match(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g) || [];
        console.log(`\n找到 ${cssRefs.length} 个CSS引用:`);
        cssRefs.forEach(ref => {
            const href = ref.match(/href="([^"]+)"/)[1];
            console.log(`- ${href}`);
            
            // 检查是否使用了CDN域名
            if (href.includes(CDN_DOMAIN)) {
                console.log(`  ✅ 使用了CDN域名`);
            } else {
                console.log(`  ❌ 未使用CDN域名`);
            }
        });
        
        // 检查字体引用
        const fontRefs = content.match(/<link[^>]*rel="preload"[^>]*as="font"[^>]*href="([^"]+)"/g) || [];
        console.log(`\n找到 ${fontRefs.length} 个字体预加载引用:`);
        fontRefs.forEach(ref => {
            const href = ref.match(/href="([^"]+)"/)[1];
            console.log(`- ${href}`);
            
            // 检查是否使用了CDN域名
            if (href.includes(CDN_DOMAIN)) {
                console.log(`  ✅ 使用了CDN域名`);
            } else {
                console.log(`  ❌ 未使用CDN域名`);
            }
            
            // 检查是否设置了crossorigin属性
            if (ref.includes('crossorigin')) {
                console.log(`  ✅ 设置了crossorigin属性`);
            } else {
                console.log(`  ❌ 未设置crossorigin属性`);
            }
        });
        
        // 检查JS引用
        const jsRefs = content.match(/<script[^>]*src="([^"]+)"/g) || [];
        console.log(`\n找到 ${jsRefs.length} 个JS引用:`);
        jsRefs.forEach(ref => {
            const src = ref.match(/src="([^"]+)"/)[1];
            console.log(`- ${src}`);
            
            // 检查是否使用了CDN域名
            if (src.includes(CDN_DOMAIN)) {
                console.log(`  ✅ 使用了CDN域名`);
            } else {
                console.log(`  ❌ 未使用CDN域名`);
            }
        });
        
        // 检查图片引用
        const imgRefs = content.match(/<img[^>]*src="([^"]+)"/g) || [];
        console.log(`\n找到 ${imgRefs.length} 个图片引用:`);
        imgRefs.forEach(ref => {
            const src = ref.match(/src="([^"]+)"/)[1];
            console.log(`- ${src}`);
            
            // 检查是否使用了CDN域名
            if (src.includes(CDN_DOMAIN)) {
                console.log(`  ✅ 使用了CDN域名`);
            } else {
                console.log(`  ❌ 未使用CDN域名`);
            }
        });
        
    } catch (error) {
        console.error(`❌ 检查HTML引用失败: ${error.message}`);
    }
}

// 主函数
async function main() {
    console.log(`\n===== 开始检查CDN资源 (${CDN_DOMAIN}) =====\n`);

    // 检查所有关键资源
    for (const asset of criticalAssets) {
        await checkAsset(asset);
    }

    // 检查HTML文件中的资源引用
    await checkHtmlReferences();
    
    // 检查构建目录中的文件
    try {
        const distDir = path.join(projectRoot, 'dist');
        const files = await fs.readdir(distDir, { recursive: true });
        
        // 查找所有CSS文件
        const cssFiles = files.filter(file => file.endsWith('.css'));
        console.log('\n找到以下CSS文件:');
        cssFiles.forEach(file => console.log(`- ${file}`));
        
        // 查找所有JS文件
        const jsFiles = files.filter(file => file.endsWith('.js'));
        console.log('\n找到以下JS文件:');
        jsFiles.forEach(file => console.log(`- ${file}`));
        
    } catch (error) {
        console.error(`无法读取构建目录: ${error.message}`);
    }

    console.log('\n===== CDN资源检查完成 =====');
}

// 运行主函数
main().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
});
