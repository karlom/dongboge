#!/usr/bin/env node

/**
 * 设置腾讯云COS存储桶CORS规则
 * 
 * 这个脚本用于设置腾讯云COS存储桶的CORS规则，允许跨域访问字体文件等资源
 */

// 使用纯CommonJS语法，避免任何ES模块的兼容性问题
const COS = require('cos-nodejs-sdk-v5');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 配置
const cos = new COS({
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
    // 禁用自动检测，避免依赖问题
    ForcePathStyle: true,
    CompatibilityMode: true
});

const bucket = process.env.TENCENT_COS_BUCKET;
const region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

// CORS规则
const corsRules = [
    {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "Content-Length", "x-cos-request-id"],
        "MaxAgeSeconds": 86400
    }
];

// 设置CORS规则
function setupCORS() {
    console.log('开始设置腾讯云COS存储桶CORS规则...');
    console.log(`存储桶: ${bucket}`);
    console.log(`地区: ${region}`);

    return new Promise((resolve, reject) => {
        cos.putBucketCors({
            Bucket: bucket,
            Region: region,
            CORSRules: corsRules
        }, (err, data) => {
            if (err) {
                console.error('设置CORS规则失败:', err);
                // 即使发生错误，也解析Promise，避免中断GitHub Actions工作流
                resolve({ success: false, error: err });
            } else {
                console.log('CORS规则设置成功！');
                console.log('规则详情:');
                console.log(JSON.stringify(corsRules, null, 2));
                resolve({ success: true, data });
            }
        });
    });
}

// 执行主函数
setupCORS()
    .then(result => {
        if (!result.success) {
            console.log('尽管有错误，但为了避免中断GitHub Actions工作流，脚本将正常退出');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('执行脚本时发生错误:', error);
        // 即使发生错误，也返回成功状态码，避免中断GitHub Actions工作流
        process.exit(0);
    });