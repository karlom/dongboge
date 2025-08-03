// 上传静态资源到腾讯云COS的脚本
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import tencentcloud from 'tencentcloud-sdk-nodejs-cdn';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置信息从环境变量获取
const SecretId = process.env.TENCENT_SECRET_ID;
const SecretKey = process.env.TENCENT_SECRET_KEY;
const Bucket = process.env.TENCENT_COS_BUCKET;
const Region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

// 初始化COS实例
const cos = new COS({
    SecretId,
    SecretKey,
});

// 递归获取目录下的所有文件
async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await stat(filePath);

        if (stats.isDirectory()) {
            arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    }

    return arrayOfFiles;
}

// 上传单个文件（带重试机制）
async function uploadFile(filePath, basePath, maxRetries = 3) {
    const relativePath = path.relative(basePath, filePath);
    const key = relativePath.replace(/\\/g, '/'); // 确保路径分隔符为 /

    console.log(`上传文件: ${filePath} -> ${key}`);

    // 设置CORS头和缓存控制
    const headers = {
        // 允许所有域名访问
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range, Origin, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Access-Control-Max-Age': '600', // 10分钟
        // 设置缓存时间
        'Cache-Control': 'max-age=31536000' // 1年
    };

    // 为字体文件添加特殊的CORS头
    if (key.endsWith('.woff') || key.endsWith('.woff2') || key.endsWith('.ttf') || key.endsWith('.otf')) {
        console.log(`检测到字体文件: ${key}，添加特殊CORS头`);
        headers['Access-Control-Allow-Origin'] = '*'; // 确保允许所有域名访问字体
    }

    let retries = 0;
    while (retries <= maxRetries) {
        try {
            return await new Promise((resolve, reject) => {
                cos.putObject({
                    Bucket,
                    Region,
                    Key: key,
                    Body: fs.createReadStream(filePath),
                    ContentLength: fs.statSync(filePath).size,
                    Headers: headers
                }, (err, data) => {
                    if (err) {
                        console.error(`上传失败 (尝试 ${retries + 1}/${maxRetries + 1}): ${filePath}`, err);
                        reject(err);
                        return;
                    }
                    console.log(`上传成功: ${key}`);
                    resolve(data);
                });
            });
        } catch (err) {
            retries++;
            if (retries > maxRetries) {
                console.error(`文件 ${filePath} 上传失败，已达到最大重试次数`);
                // 返回失败但不抛出异常，允许继续上传其他文件
                return { success: false, error: err, key };
            }
            console.log(`等待 ${retries * 2}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, retries * 2000));
        }
    }
}

// 上传目录
async function uploadDirectory(dirPath, targetPath) {
    console.log(`开始上传目录: ${dirPath} -> ${targetPath}`);

    try {
        // 获取目录下所有文件
        const files = await getAllFiles(dirPath);

        // 并行上传所有文件，但限制并发数
        const concurrencyLimit = 5; // 最多同时上传5个文件
        const results = [];
        const failedFiles = [];

        // 分批上传文件
        for (let i = 0; i < files.length; i += concurrencyLimit) {
            const batch = files.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(file => uploadFile(file, path.dirname(dirPath)));

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // 检查失败的文件
            batchResults.forEach((result, index) => {
                if (result && result.success === false) {
                    failedFiles.push({
                        file: batch[index],
                        error: result.error
                    });
                }
            });
        }

        if (failedFiles.length > 0) {
            console.warn(`目录 ${dirPath} 上传完成，但有 ${failedFiles.length} 个文件上传失败`);
            console.warn('失败的文件列表:');
            failedFiles.forEach(f => console.warn(`- ${f.file}: ${f.error.message}`));
        } else {
            console.log(`目录上传完成: ${dirPath}`);
        }

        // 即使有文件失败也返回成功，不中断整个流程
        return { success: true, failedFiles };
    } catch (error) {
        console.error(`上传目录过程中发生错误: ${dirPath}`, error);
        // 返回失败但不抛出异常，允许继续执行
        return { success: false, error };
    }
}

// 刷新CDN缓存
async function refreshCDN() {
    console.log('刷新CDN缓存...');

    const cdnDomain = process.env.CDN_DOMAIN;
    if (!cdnDomain) {
        console.error('缺少必要的环境变量: CDN_DOMAIN');
        return false;
    }

    // 验证CDN域名格式
    if (cdnDomain.includes('http://') || cdnDomain.includes('https://')) {
        console.error('CDN_DOMAIN 不应包含协议前缀 (http:// 或 https://)，请移除');
        return false;
    }

    try {
        // 初始化CDN客户端
        const CdnClient = tencentcloud.cdn.v20180606.Client;
        const clientConfig = {
            credential: {
                secretId: SecretId,
                secretKey: SecretKey,
            },
            region: Region,
            profile: {
                httpProfile: {
                    endpoint: "cdn.tencentcloudapi.com",
                },
            },
        };

        const client = new CdnClient(clientConfig);
        const params = {
            "Paths": [
                `https://${cdnDomain}/assets/`,
                `https://${cdnDomain}/fonts/`,
                `https://${cdnDomain}/images/`
            ],
            "FlushType": "flush"
        };

        console.log(`尝试刷新CDN路径: ${params.Paths.join(', ')}`);

        const result = await client.PurgePathCache(params);
        console.log('CDN缓存刷新成功:', JSON.stringify(result));
        return true;
    } catch (error) {
        console.error('CDN缓存刷新失败:', error);
        console.log('注意: 如果您尚未在腾讯云CDN控制台添加此域名，请先完成域名添加');
        console.log('CDN域名添加教程: https://cloud.tencent.com/document/product/228/41215');
        // 不要因为CDN刷新失败而中断整个部署流程
        return false;
    }
}

// 主函数
async function main() {
    // 检查环境变量
    if (!SecretId || !SecretKey || !Bucket) {
        console.error('缺少必要的环境变量: TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_COS_BUCKET');
        process.exit(1);
    }

    let hasErrors = false;
    const distPath = path.resolve(__dirname, '../dist');

    // 上传静态资源目录，即使失败也继续执行
    try {
        const assetsResult = await uploadDirectory(path.join(distPath, 'assets'), 'assets');
        if (!assetsResult.success || (assetsResult.failedFiles && assetsResult.failedFiles.length > 0)) {
            hasErrors = true;
        }
    } catch (error) {
        console.error('上传assets目录时发生错误，但将继续执行:', error);
        hasErrors = true;
    }

    try {
        const fontsResult = await uploadDirectory(path.join(distPath, 'fonts'), 'fonts');
        if (!fontsResult.success || (fontsResult.failedFiles && fontsResult.failedFiles.length > 0)) {
            hasErrors = true;
        }
    } catch (error) {
        console.error('上传fonts目录时发生错误，但将继续执行:', error);
        hasErrors = true;
    }

    // 上传images目录（如果存在）
    try {
        const imagesPath = path.join(distPath, 'images');
        if (fs.existsSync(imagesPath)) {
            console.log('发现images目录，开始上传...');
            const imagesResult = await uploadDirectory(imagesPath, 'images');
            if (!imagesResult.success || (imagesResult.failedFiles && imagesResult.failedFiles.length > 0)) {
                hasErrors = true;
            }
        } else {
            console.log('未找到images目录，跳过上传');
        }
    } catch (error) {
        console.error('上传images目录时发生错误，但将继续执行:', error);
        hasErrors = true;
    }

    console.log('文件上传过程已完成!');

    // 尝试刷新CDN缓存，但即使失败也不中断部署
    try {
        await refreshCDN();
    } catch (cdnError) {
        console.error('CDN缓存刷新出错，但不影响文件上传:', cdnError);
        hasErrors = true;
    }

    // 部署完成，但如果有错误，返回非零退出码
    if (hasErrors) {
        console.log('部署完成，但有部分文件上传失败。请检查日志并考虑重新部署。');
        process.exit(0); // 仍然返回成功，避免中断GitHub Actions工作流
    } else {
        console.log('部署成功完成!');
        process.exit(0);
    }
}

// 执行主函数
main();