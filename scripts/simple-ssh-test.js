#!/usr/bin/env node

/**
 * 简单SSH连接测试
 * 手动输入参数，无需依赖
 */

import {
    execSync
} from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function testSSH() {
    console.log('🔍 简单SSH连接测试\n');

    try {
        // 收集参数
        const host = await question('服务器地址: ');
        const username = await question('用户名: ');
        const port = await question('端口 (默认22): ') || '22';
        const keyPath = await question('SSH密钥文件路径: ');
        const passphrase = await question('SSH密钥密码 (如果有): ');

        console.log('\n🔍 测试参数:');
        console.log(`  主机: ${host}`);
        console.log(`  用户: ${username}`);
        console.log(`  端口: ${port}`);
        console.log(`  密钥: ${keyPath}`);
        console.log(`  密码: ${passphrase ? '已设置' : '未设置'}`);

        // 构建SSH命令
        const sshCommand = `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "${keyPath}" -p ${port} ${username}@${host} "echo 'SSH连接成功'"`;

        console.log('\n🚀 开始测试连接...');

        if (passphrase) {
            console.log('🔑 使用密钥+密码认证');

            // 使用expect处理密码
            const expectScript = `expect -c "
set timeout 15
spawn ${sshCommand}
expect {
    \\"Enter passphrase for key\\" {
        send \\"${passphrase}\\r\\"
        expect {
            \\"SSH连接成功\\" {
                puts \\"✅ 连接成功!\\"
                exit 0
            }
            \\"Permission denied\\" {
                puts \\"❌ 权限被拒绝\\"
                exit 1
            }
            timeout {
                puts \\"❌ 连接超时\\"
                exit 1
            }
        }
    }
    \\"SSH连接成功\\" {
        puts \\"✅ 连接成功（无需密码）!\\"
        exit 0
    }
    \\"Permission denied\\" {
        puts \\"❌ 权限被拒绝\\"
        exit 1
    }
    \\"Connection refused\\" {
        puts \\"❌ 连接被拒绝\\"
        exit 1
    }
    timeout {
        puts \\"❌ 连接超时\\"
        exit 1
    }
}
"`;

            try {
                const result = execSync(expectScript, {
                    stdio: 'inherit',
                    shell: '/bin/bash'
                });
                console.log('🎉 SSH测试完成！');
            } catch (error) {
                console.log('❌ SSH连接失败');
                console.log('💡 可能的原因:');
                console.log('  1. 密钥密码不正确');
                console.log('  2. 服务器上没有对应的公钥');
                console.log('  3. 服务器SSH配置问题');
                console.log('  4. 网络连接问题');
            }
        } else {
            console.log('🔑 使用密钥认证（无密码）');

            try {
                const result = execSync(sshCommand, {
                    stdio: 'inherit',
                    timeout: 15000
                });
                console.log('🎉 SSH连接成功！');
            } catch (error) {
                console.log('❌ SSH连接失败');
                console.log('💡 可能的原因:');
                console.log('  1. 密钥文件路径不正确');
                console.log('  2. 密钥需要密码但未提供');
                console.log('  3. 服务器上没有对应的公钥');
                console.log('  4. 网络连接问题');
            }
        }

        // 提供手动测试命令
        console.log('\n🛠️ 手动测试命令:');
        console.log(`ssh -v -i "${keyPath}" -p ${port} ${username}@${host}`);

    } catch (error) {
        console.log(`❌ 测试失败: ${error.message}`);
    } finally {
        rl.close();
    }
}

testSSH();