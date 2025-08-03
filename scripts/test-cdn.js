// 测试CDN配置的脚本
const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

// 从.env.production文件中读取CDN_URL
async function getCdnUrl() {
    try {
        const envContent = await readFile(path.resolve(__dirname, '../.env.production'), 'utf8');
        const match = envContent.match(/PUBLIC_CDN_URL=['"]([^'"]+)['"]/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('读取.env.production文件失败:', error);
        return null;
    }
}

// 测试CDN资源是否可访问
async function testCdnResource(url) {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            const { statusCode } = res;
            let error;

            if (statusCode !== 200) {
                error = new Error(`请求失败，状态码: ${statusCode}`);
            }

            if (error) {
                console.error(`测试 ${url} 失败:`, error.message);
                res.resume(); // 消费响应数据以释放内存
                resolve(false);
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    console.log(`测试 ${url} 成功!`);
                    resolve(true);
                } catch (e) {
                    console.error(`测试 ${url} 失败:`, e.message);
                    resolve(false);
                }
            });
        }).on('error', (e) => {
            console.error(`测试 ${url} 失败:`, e.message);
            resolve(false);
        });
    });
}

// 主函数
async function main() {
    try {
        // 获取CDN URL
        const cdnUrl = await getCdnUrl();
        if (!cdnUrl) {
            console.error('无法获取CDN URL，请检查.env.production文件');
            process.exit(1);
        }

        console.log(`使用CDN URL: ${cdnUrl}`);

        // 测试几个常用资源
        const resourcesToTest = [
            '/assets/styles.css',
            '/fonts/atkinson-regular.woff',
            '/assets/blog-placeholder-1.jpg'
        ];

        let allSuccess = true;

        for (const resource of resourcesToTest) {
            const url = `${cdnUrl}${resource}`;
            const success = await testCdnResource(url);
            if (!success) {
                allSuccess = false;
            }
        }

        if (allSuccess) {
            console.log('✅ 所有CDN资源测试通过!');
        } else {
            console.error('❌ 部分CDN资源测试失败，请检查配置');
            process.exit(1);
        }
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        process.exit(1);
    }
}

// 执行主函数
main();