#!/usr/bin/env node

/**
 * SSH认证设置助手
 * 帮助用户配置SSH密钥+密码认证
 */

import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';
import readline from 'readline';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 异步问题函数
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// 检查SSH密钥是否存在
function checkSSHKey(keyPath) {
    const expandedPath = keyPath.startsWith('~/') ?
        path.join(process.env.HOME, keyPath.slice(2)) :
        keyPath;

    return fs.existsSync(expandedPath);
}

// 检查expect工具
function checkExpect() {
    try {
        execSync('which expect', {
            stdio: 'pipe'
        });
        return true;
    } catch (error) {
        return false;
    }
}

// 生成.env文件
function generateEnvFile(config) {
    const envContent = `# SSH服务器配置
HOST=${config.host}
USERNAME=${config.username}
PORT=${config.port || '22'}

# SSH认证配置
SSH_KEY_PATH=${config.keyPath}
SSH_PASSPHRASE=${config.passphrase}

# CDN配置（可选）
TENCENT_SECRET_ID=your-secret-id
TENCENT_SECRET_KEY=your-secret-key
TENCENT_COS_BUCKET=your-bucket-name
TENCENT_COS_REGION=ap-guangzhou

# 构建配置
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
`;

    fs.writeFileSync('.env', envContent);
    log('green', '✅ .env文件已创建');
}

// 主函数
async function main() {
    log('cyan', '🔧 SSH认证设置助手');
    log('blue', '这个工具将帮助你配置SSH密钥+密码认证\n');

    try {
        // 1. 检查expect工具
        log('blue', '🔍 检查系统要求...');
        if (!checkExpect()) {
            log('yellow', '⚠️ 未安装expect工具');
            log('blue', '请安装expect:');
            log('blue', '  macOS: brew install expect');
            log('blue', '  Ubuntu: sudo apt-get install expect');
            log('blue', '  CentOS: sudo yum install expect');

            const continueSetup = await question('是否继续设置？(y/n): ');
            if (continueSetup.toLowerCase() !== 'y') {
                process.exit(0);
            }
        } else {
            log('green', '✅ expect工具已安装');
        }

        // 2. 收集服务器信息
        log('\n🌐 服务器配置');
        const host = await question('服务器地址: ');
        const username = await question('用户名: ');
        const port = await question('端口 (默认22): ') || '22';

        // 3. SSH密钥配置
        log('\n🔑 SSH密钥配置');
        const defaultKeyPath = '~/.ssh/id_rsa';
        const keyPath = await question(`SSH密钥路径 (默认${defaultKeyPath}): `) || defaultKeyPath;

        if (!checkSSHKey(keyPath)) {
            log('yellow', `⚠️ SSH密钥文件不存在: ${keyPath}`);
            const generateKey = await question('是否生成新的SSH密钥？(y/n): ');

            if (generateKey.toLowerCase() === 'y') {
                const email = await question('邮箱地址: ');
                try {
                    log('blue', '🔨 生成SSH密钥...');
                    execSync(`ssh-keygen -t rsa -b 4096 -C "${email}" -f ${keyPath.replace('~', process.env.HOME)}`, {
                        stdio: 'inherit'
                    });
                    log('green', '✅ SSH密钥已生成');
                } catch (error) {
                    log('red', '❌ SSH密钥生成失败');
                    process.exit(1);
                }
            } else {
                log('yellow', '⚠️ 请确保SSH密钥文件存在后再运行');
                process.exit(1);
            }
        } else {
            log('green', '✅ SSH密钥文件存在');
        }

        // 4. 密钥密码
        const passphrase = await question('SSH密钥密码: ');

        // 5. 生成配置
        const config = {
            host,
            username,
            port,
            keyPath,
            passphrase
        };

        log('\n📝 生成配置文件...');
        generateEnvFile(config);

        // 6. 测试连接
        log('\n🧪 测试SSH连接...');
        const testConnection = await question('是否测试SSH连接？(y/n): ');

        if (testConnection.toLowerCase() === 'y') {
            try {
                log('blue', '🔍 测试连接中...');

                // 设置环境变量
                process.env.HOST = host;
                process.env.USERNAME = username;
                process.env.PORT = port;
                process.env.SSH_KEY_PATH = keyPath;
                process.env.SSH_PASSPHRASE = passphrase;

                // 运行测试
                execSync('npm run deploy:test-server', {
                    stdio: 'inherit'
                });

            } catch (error) {
                log('red', '❌ 连接测试失败');
                log('yellow', '请检查配置并手动测试连接');
            }
        }

        // 7. 显示下一步
        log('\n🎉 设置完成！');
        log('blue', '下一步操作:');
        log('blue', '  1. 将公钥添加到服务器: ssh-copy-id -i ~/.ssh/id_rsa.pub user@server');
        log('blue', '  2. 测试部署流程: npm run deploy:test');
        log('blue', '  3. 运行简化部署: npm run deploy:simple');
        log('blue', '  4. 查看帮助: npm run deploy:help');

        log('\n📚 详细配置说明请查看: scripts/SSH密钥+密码认证配置.md');

    } catch (error) {
        log('red', `❌ 设置失败: ${error.message}`);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// 运行主函数
main().catch(error => {
    log('red', `❌ 执行失败: ${error.message}`);
    process.exit(1);
});