#!/usr/bin/env node

/**
 * 预部署检查脚本
 * 检查部署前的所有必要条件
 */

import fs from 'fs';
import {
    execSync
} from 'child_process';

// 手动加载.env文件
function loadEnvFile() {
    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnvFile();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function preDeployCheck() {
    log('blue', '🔍 预部署检查');
    log('blue', '===================\n');

    let hasErrors = false;
    let hasWarnings = false;

    // 1. 检查环境变量
    log('blue', '📋 检查环境变量:');
    const requiredEnvs = ['HOST', 'USERNAME', 'SSH_KEY_PATH', 'SSH_PASSPHRASE'];

    requiredEnvs.forEach(env => {
        if (process.env[env]) {
            log('green', `  ✅ ${env}: 已设置`);
        } else {
            log('red', `  ❌ ${env}: 未设置`);
            hasErrors = true;
        }
    });

    // 2. 检查SSH密钥文件
    log('\n🔑 检查SSH密钥:');
    const keyPath = process.env.SSH_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
        log('green', `  ✅ 密钥文件存在: ${keyPath}`);

        // 检查权限
        const stats = fs.statSync(keyPath);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        if (mode === '600') {
            log('green', '  ✅ 文件权限正确 (600)');
        } else {
            log('yellow', `  ⚠️ 文件权限: ${mode} (建议600)`);
            hasWarnings = true;
        }
    } else {
        log('red', `  ❌ 密钥文件不存在: ${keyPath}`);
        hasErrors = true;
    }

    // 3. 检查系统工具
    log('\n🛠️ 检查系统工具:');
    const tools = ['ssh', 'rsync', 'expect'];

    tools.forEach(tool => {
        try {
            execSync(`which ${tool}`, {
                stdio: 'pipe'
            });
            log('green', `  ✅ ${tool}: 已安装`);
        } catch (error) {
            if (tool === 'expect') {
                log('red', `  ❌ ${tool}: 未安装 (密钥+密码认证需要)`);
                hasErrors = true;
            } else {
                log('red', `  ❌ ${tool}: 未安装`);
                hasErrors = true;
            }
        }
    });

    // 4. 检查网络连接
    log('\n🌐 检查网络连接:');
    if (process.env.HOST) {
        try {
            const pingCmd = process.platform === 'win32' ?
                `ping -n 1 ${process.env.HOST}` :
                `ping -c 1 ${process.env.HOST}`;

            execSync(pingCmd, {
                stdio: 'pipe',
                timeout: 5000
            });
            log('green', `  ✅ 网络连接正常: ${process.env.HOST}`);
        } catch (error) {
            log('red', `  ❌ 网络连接失败: ${process.env.HOST}`);
            hasErrors = true;
        }
    }

    // 5. 检查GitHub Secrets（如果是CI环境）
    if (process.env.GITHUB_ACTIONS) {
        log('\n🔐 检查GitHub Secrets:');
        const secrets = ['HOST', 'USERNAME', 'SSH_PRIVATE_KEY', 'SSH_PASSPHRASE'];

        secrets.forEach(secret => {
            if (process.env[secret]) {
                log('green', `  ✅ ${secret}: 已配置`);
            } else {
                log('red', `  ❌ ${secret}: 未配置`);
                hasErrors = true;
            }
        });
    }

    // 6. 检查构建目录
    log('\n📁 检查构建环境:');
    if (fs.existsSync('dist')) {
        log('green', '  ✅ dist目录存在');
    } else {
        log('yellow', '  ⚠️ dist目录不存在（将在构建时创建）');
        hasWarnings = true;
    }

    // 总结
    log('\n📊 检查结果:');
    if (hasErrors) {
        log('red', '❌ 发现错误，建议修复后再部署');
        log('blue', '\n💡 修复建议:');
        log('blue', '  1. 确保所有环境变量都已设置');
        log('blue', '  2. 安装缺少的系统工具');
        log('blue', '  3. 检查网络连接和SSH配置');
        return false;
    } else if (hasWarnings) {
        log('yellow', '⚠️ 发现警告，但可以继续部署');
        return true;
    } else {
        log('green', '✅ 所有检查通过，可以安全部署');
        return true;
    }
}

preDeployCheck().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    log('red', `❌ 检查失败: ${error.message}`);
    process.exit(1);
});