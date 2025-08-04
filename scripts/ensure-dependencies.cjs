#!/usr/bin/env node

/**
 * 确保依赖项安装脚本
 * 用于在部署时检查和安装必要的依赖项
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 检查项目依赖...');

// 检查package.json是否存在
if (!fs.existsSync('package.json')) {
    console.error('❌ package.json 文件不存在');
    process.exit(1);
}

// 检查node_modules是否存在
if (!fs.existsSync('node_modules')) {
    console.log('📦 安装依赖包...');
    try {
        execSync('npm ci', { stdio: 'inherit' });
        console.log('✅ 依赖安装完成');
    } catch (error) {
        console.error('❌ 依赖安装失败:', error.message);
        process.exit(1);
    }
} else {
    console.log('✅ 依赖已存在，跳过安装');
}

console.log('🎉 依赖检查完成');