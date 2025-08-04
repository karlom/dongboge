#!/usr/bin/env node

/**
 * 简化的腾讯云COS存储桶CORS规则设置脚本
 * 使用HTTP API直接调用，避免SDK依赖问题
 */

const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

// 配置
const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
const bucket = process.env.TENCENT_COS_BUCKET;
const region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

if (!secretId || !secretKey || !bucket) {
    console.log('⚠️  缺少必要的环境变量，跳过CORS设置');
    console.log('需要设置: TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_COS_BUCKET');
    process.exit(0);
}

// 生成签名
function generateSignature(method, pathname, params, headers) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiredTime = timestamp + 3600;

    // 构建签名字符串
    const signTime = `${timestamp};${expiredTime}`;
    const signKey = crypto.createHmac('sha1', secretKey).update(signTime).digest('hex');

    const httpString = `${method.toLowerCase()}\n${pathname}\n${params}\n${headers}\n`;
    const stringToSign = `sha1\n${signTime}\n${crypto.createHash('sha1').update(httpString).digest('hex')}\n`;
    const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

    return `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${signTime}&q-key-time=${signTime}&q-header-list=host&q-url-param-list=cors&q-signature=${signature}`;
}

// CORS规则XML
const corsXML = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <ExposeHeader>Content-Length</ExposeHeader>
        <ExposeHeader>x-cos-request-id</ExposeHeader>
        <MaxAgeSeconds>86400</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`;

// 设置CORS规则
function setupCORS() {
    return new Promise((resolve, reject) => {
        const host = `${bucket}.cos.${region}.myqcloud.com`;
        const pathname = '/';
        const params = 'cors';
        const headers = `host`;

        const authorization = generateSignature('PUT', pathname, params, headers);

        const options = {
            hostname: host,
            port: 443,
            path: '/?cors',
            method: 'PUT',
            headers: {
                'Host': host,
                'Authorization': authorization,
                'Content-Type': 'application/xml',
                'Content-Length': Buffer.byteLength(corsXML)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ CORS规则设置成功！');
                    resolve({ success: true });
                } else {
                    console.log(`⚠️  CORS设置返回状态码: ${res.statusCode}`);
                    console.log('响应:', data);
                    // 即使失败也返回成功，避免中断部署
                    resolve({ success: false, statusCode: res.statusCode });
                }
            });
        });

        req.on('error', (error) => {
            console.log('⚠️  CORS设置出现错误:', error.message);
            // 即使出错也返回成功，避免中断部署
            resolve({ success: false, error: error.message });
        });

        req.write(corsXML);
        req.end();
    });
}

// 执行主函数
console.log('🔧 开始设置腾讯云COS存储桶CORS规则...');
console.log(`📦 存储桶: ${bucket}`);
console.log(`🌍 地区: ${region}`);

setupCORS()
    .then(result => {
        if (result.success) {
            console.log('🎉 CORS规则设置完成！');
        } else {
            console.log('⚠️  CORS设置未成功，但不影响部署继续进行');
        }
        process.exit(0);
    })
    .catch(error => {
        console.log('❌ 执行CORS设置时发生错误:', error);
        console.log('⚠️  为避免中断部署，脚本将正常退出');
        process.exit(0);
    });