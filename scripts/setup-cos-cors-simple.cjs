#!/usr/bin/env node

/**
 * 简化的COS CORS设置脚本
 * 用于配置腾讯云COS的跨域访问规则
 */

const COS = require('cos-nodejs-sdk-v5');

// 从环境变量获取配置
const config = {
    SecretId: process.env.COS_SECRET_ID || process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY || process.env.TENCENT_SECRET_KEY,
    Bucket: 'dongboge-1251880339',
    Region: 'ap-guangzhou'
};

// 验证配置
if (!config.SecretId || !config.SecretKey) {
    console.error('❌ 缺少COS配置信息');
    console.error('请设置环境变量: COS_SECRET_ID, COS_SECRET_KEY');
    process.exit(1);
}

const cos = new COS({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey
});

async function setupCORS() {
    console.log('🔧 设置COS CORS规则...');

    const corsRules = [{
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 3600
    }];

    try {
        await new Promise((resolve, reject) => {
            cos.putBucketCors({
                Bucket: config.Bucket,
                Region: config.Region,
                CORSRules: corsRules
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        console.log('✅ CORS规则设置成功');
    } catch (error) {
        console.error('❌ CORS设置失败:', error.message);
        process.exit(1);
    }
}

setupCORS();