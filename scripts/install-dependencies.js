#!/usr/bin/env node

/**
 * 依赖安装脚本
 * 
 * 这个脚本用于安装项目所需的所有依赖，包括腾讯云SDK和其依赖项。
 * 它会检查是否已安装依赖，如果没有则安装。
 * 
 * 使用方法:
 * node scripts/install-dependencies.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 要安装的依赖
const dependencies = [
    'cos-nodejs-sdk-v5',
    'tencentcloud-sdk-nodejs-cdn',
    'strnum',
    'fast-xml-parser@4.2.5',
    'node-fetch',
    'jsdom'
];

// 检查依赖是否已安装
function checkDependency(dependency) {
    const baseName = dependency.split('@')[0];
    try {
        // 检查node_modules目录中是否存在该依赖
        const modulePath = path.join(projectRoot, 'node_modules', baseName);
        return fs.existsSync(modulePath);
    } catch (error) {
        return false;
    }
}

// 安装依赖
function installDependency(dependency) {
    console.log(`安装依赖: ${dependency}`);
    try {
        execSync(`npm install ${dependency}`, { stdio: 'inherit', cwd: projectRoot });
        return true;
    } catch (error) {
        console.error(`安装 ${dependency} 失败:`, error.message);
        return false;
    }
}

// 主函数
async function main() {
    console.log('开始检查和安装依赖...');

    let allInstalled = true;

    for (const dependency of dependencies) {
        if (!checkDependency(dependency)) {
            console.log(`依赖 ${dependency} 未安装，开始安装...`);
            const success = installDependency(dependency);
            if (!success) {
                allInstalled = false;
            }
        } else {
            console.log(`依赖 ${dependency} 已安装`);
        }
    }

    if (allInstalled) {
        console.log('所有依赖安装成功！');
    } else {
        console.error('部分依赖安装失败，请查看上面的错误信息');
        process.exit(1);
    }
}

// 运行主函数
main().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
});