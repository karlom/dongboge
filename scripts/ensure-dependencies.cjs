#!/usr/bin/env node

/**
 * 确保所有必要的依赖都正确安装
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 确保依赖正确安装...');

try {
    // 检查COS SDK是否存在
    const cosSDKPath = path.join(process.cwd(), 'node_modules', 'cos-nodejs-sdk-v5');

    if (!fs.existsSync(cosSDKPath)) {
        console.log('📦 安装COS SDK...');
        execSync('npm install cos-nodejs-sdk-v5@2.11.19 --save-dev --silent --no-audit --no-fund', { stdio: 'pipe' });
    }

    // 验证安装
    try {
        require('cos-nodejs-sdk-v5');
        console.log('✅ COS SDK验证成功');
    } catch (error) {
        console.log('❌ COS SDK验证失败，重新安装...');
        execSync('npm install cos-nodejs-sdk-v5@2.11.19 --save-dev --force --silent --no-audit --no-fund', { stdio: 'pipe' });
        require('cos-nodejs-sdk-v5');
        console.log('✅ COS SDK重新安装成功');
    }

    console.log('🎉 所有依赖检查完成');
    process.exit(0);

} catch (error) {
    console.error('❌ 依赖安装失败:', error.message);
    console.log('⚠️  继续执行，避免中断部署流程');
    process.exit(0);
}