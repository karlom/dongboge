// 设置腾讯云COS存储桶的CORS规则
import COS from 'cos-nodejs-sdk-v5';
import { fileURLToPath } from 'url';
import path from 'path';

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

// 设置存储桶的CORS规则
async function setupCORS() {
    console.log(`为存储桶 ${Bucket} 设置CORS规则...`);

    try {
        // 设置CORS规则
        await new Promise((resolve, reject) => {
            cos.putBucketCors({
                Bucket,
                Region,
                CORSRules: [
                    {
                        AllowedOrigins: ['*'], // 允许所有域名访问
                        AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'], // 允许的HTTP方法
                        AllowedHeaders: ['*'], // 允许所有请求头
                        ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Disposition', 'x-cos-request-id'], // 暴露的响应头
                        MaxAgeSeconds: 86400 // 预检请求的有效期，单位为秒
                    }
                ]
            }, (err, data) => {
                if (err) {
                    console.error('设置CORS规则失败:', err);
                    reject(err);
                    return;
                }
                console.log('CORS规则设置成功:', data);
                resolve(data);
            });
        });

        // 设置存储桶的访问权限为公共读
        await new Promise((resolve, reject) => {
            cos.putBucketAcl({
                Bucket,
                Region,
                ACL: 'public-read' // 设置为公共读
            }, (err, data) => {
                if (err) {
                    console.error('设置存储桶访问权限失败:', err);
                    reject(err);
                    return;
                }
                console.log('存储桶访问权限设置成功:', data);
                resolve(data);
            });
        });

        return true;
    } catch (error) {
        console.error('设置CORS规则过程中发生错误:', error);
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

    try {
        const success = await setupCORS();
        if (success) {
            console.log('CORS规则设置成功!');
            process.exit(0);
        } else {
            console.error('CORS规则设置失败!');
            process.exit(1);
        }
    } catch (error) {
        console.error('设置CORS规则过程中发生错误:', error);
        process.exit(1);
    }
}

// 执行主函数
main();