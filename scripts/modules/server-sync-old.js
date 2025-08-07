/**
 * 服务器同步模块
 * 将构建后的文件同步到服务器
 */

import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';

// 配置
const config = {
    server: {
        host: process.env.HOST,
        username: process.env.USERNAME,
        port: process.env.PORT || '22',
        deployPath: '/var/www/dongboge/client',
        // SSH认证配置
        keyPath: process.env.SSH_KEY_PATH || '~/.ssh/id_rsa',
        passphrase: process.env.SSH_PASSPHRASE || '',
        // 支持密钥内容直接传入（用于CI/CD）
        keyContent: process.env.SSH_PRIVATE_KEY || ''
    },
    rsync: {
        options: '-rltzv --delete',
        excludes: [
            'node_modules/',
            '.git/',
            '*.log',
            '.DS_Store'
        ]
    }
};

// 生成rsync排除参数
function generateExcludeParams() {
    return config.rsync.excludes.map(exclude => `--exclude='${exclude}'`).join(' ');
}

// 设置SSH环境
function setupSSHEnvironment() {
    try {
        console.log('🔐 设置SSH环境...');

        // 如果提供了密钥内容（CI/CD环境）
        if (config.server.keyContent) {
            console.log('📝 使用提供的SSH密钥内容');

            // 确保.ssh目录存在
            const sshDir = path.join(process.env.HOME || '~', '.ssh');
            if (!fs.existsSync(sshDir)) {
                fs.mkdirSync(sshDir, {
                    mode: 0o700
                });
            }

            // 写入密钥文件
            const keyPath = path.join(sshDir, 'deploy_key');
            fs.writeFileSync(keyPath, config.server.keyContent, {
                mode: 0o600
            });
            config.server.keyPath = keyPath;

            console.log(`✅ SSH密钥已写入: ${keyPath}`);
        } else {
            console.log(`📁 使用SSH密钥文件: ${config.server.keyPath}`);

            // 展开路径中的~
            let expandedKeyPath = config.server.keyPath;
            if (expandedKeyPath.startsWith('~/')) {
                expandedKeyPath = path.join(process.env.HOME, expandedKeyPath.slice(2));
            }

            console.log(`🔍 检查密钥文件: ${expandedKeyPath}`);

            // 检查密钥文件是否存在
            if (!fs.existsSync(expandedKeyPath)) {
                // 列出目录内容帮助调试
                const dir = path.dirname(expandedKeyPath);
                if (fs.existsSync(dir)) {
                    console.log(`📁 目录 ${dir} 的内容:`);
                    const files = fs.readdirSync(dir);
                    files.forEach(file => console.log(`  - ${file}`));
                }
                throw new Error(`SSH密钥文件不存在: ${expandedKeyPath}`);
            }

            // 检查文件权限
            const stats = fs.statSync(expandedKeyPath);
            const mode = (stats.mode & parseInt('777', 8)).toString(8);
            console.log(`📋 密钥文件权限: ${mode}`);

            // 设置正确的权限
            if (mode !== '600') {
                console.log('🔧 修正密钥文件权限为600...');
                fs.chmodSync(expandedKeyPath, 0o600);
            }

            config.server.keyPath = expandedKeyPath;
        }

        return true;
    } catch (error) {
        console.error('❌ SSH环境设置失败:', error.message);
        return false;
    }
}

// 生成SSH命令选项
function generateSSHOptions() {
    const options = [
        '-o ConnectTimeout=10',
        '-o StrictHostKeyChecking=no',
        `-p ${config.server.port}`,
        `-i ${config.server.keyPath}`
    ];

    return options.join(' ');
}

// 检查SSH连接
function checkSSHConnection() {
    try {
        console.log('🔐 检查SSH连接...');

        // 设置SSH环境
        if (!setupSSHEnvironment()) {
            return false;
        }

        const sshOptions = generateSSHOptions();
        const sshCommand = `ssh ${sshOptions} ${config.server.username}@${config.server.host} "echo 'SSH连接成功'"`;

        console.log(`🔍 测试SSH连接: ${config.server.username}@${config.server.host}:${config.server.port}`);
        console.log(`🔑 使用密钥: ${config.server.keyPath}`);

        // 如果有密码，需要使用sshpass或expect
        let result;
        if (config.server.passphrase) {
            console.log('🔑 使用密钥+密码认证');

            // 检查是否安装了expect
            try {
                execSync('which expect', {
                    stdio: 'pipe'
                });
            } catch (error) {
                console.warn('⚠️ 未安装expect，尝试使用SSH_ASKPASS');

                // 使用SSH_ASKPASS环境变量
                const askpassScript = `#!/bin/bash\necho "${config.server.passphrase}"`;
                const askpassPath = '/tmp/ssh_askpass.sh';
                fs.writeFileSync(askpassPath, askpassScript, {
                    mode: 0o755
                });

                result = execSync(sshCommand, {
                    stdio: 'pipe',
                    timeout: 15000,
                    env: {
                        ...process.env,
                        SSH_ASKPASS: askpassPath,
                        DISPLAY: ':0'
                    }
                });

                // 清理临时文件
                fs.unlinkSync(askpassPath);
            }

            if (!result) {
                // 使用expect来处理密码输入
                const expectScript = `expect -c "
set timeout 15
spawn ${sshCommand}
expect {
    \\"Enter passphrase for key\\" {
        send \\"${config.server.passphrase}\\r\\"
        expect \\"SSH连接成功\\"
    }
    \\"SSH连接成功\\" {
        # 直接成功
    }
    timeout {
        exit 1
    }
    eof {
        exit 1
    }
}
"`;

                result = execSync(expectScript, {
                    stdio: 'pipe',
                    timeout: 20000,
                    shell: '/bin/bash'
                });
            }
        } else {
            console.log('🔑 使用密钥认证（无密码）');
            result = execSync(sshCommand, {
                stdio: 'pipe',
                timeout: 15000
            });
        }

        console.log('✅ SSH连接正常');
        return true;
    } catch (error) {
        console.error('❌ SSH连接失败:', error.message);
        console.log('💡 请检查:');
        console.log('  - SSH密钥路径是否正确');
        console.log('  - SSH密钥密码是否正确');
        console.log('  - 服务器地址和端口是否正确');
        console.log('  - 网络连接是否正常');
        return false;
    }
}

// 确保服务器目录存在
// 执行SSH命令（支持密钥+密码认证）
function executeSSHCommand(command, options = {}) {
    const sshOptions = generateSSHOptions();
    const sshCommand = `ssh ${sshOptions} ${config.server.username}@${config.server.host} "${command}"`;

    if (config.server.passphrase) {
        // 使用expect处理密码
        const expectScript = `expect -c "
set timeout 30
spawn ${sshCommand}
expect {
    \\"Enter passphrase for key\\" {
        send \\"${config.server.passphrase}\\r\\"
        expect eof
    }
    eof {
        # 命令执行完成
    }
    timeout {
        exit 1
    }
}
"`;

        return execSync(expectScript, {
            stdio: options.stdio || 'inherit',
            timeout: options.timeout || 30000,
            shell: '/bin/bash'
        });
    } else {
        return execSync(sshCommand, {
            stdio: options.stdio || 'inherit',
            timeout: options.timeout || 30000
        });
    }
}

function ensureServerDirectories() {
    try {
        console.log('📁 确保服务器目录存在...');

        const command = `mkdir -p ${config.server.deployPath} && chmod 755 ${config.server.deployPath}`;
        executeSSHCommand(command);

        console.log('✅ 服务器目录已准备');
        return true;
    } catch (error) {
        console.error('❌ 创建服务器目录失败:', error.message);
        return false;
    }
}

// 同步构建文件到服务器
function syncBuildFiles() {
    try {
        console.log('📤 同步构建文件到服务器...');

        const distPath = 'dist/';
        const excludeParams = generateExcludeParams();

        // 检查dist目录是否存在
        if (!fs.existsSync(distPath)) {
            throw new Error('构建目录不存在，请先运行构建');
        }

        // 生成SSH选项用于rsync
        const sshOptions = generateSSHOptions();

        // 使用rsync同步文件
        let rsyncCommand;
        if (config.server.passphrase) {
            // 对于有密码的密钥，使用expect包装rsync
            rsyncCommand = `expect -c "
set timeout 60
spawn rsync ${config.rsync.options} ${excludeParams} -e \\"ssh ${sshOptions}\\" ${distPath} ${config.server.username}@${config.server.host}:${config.server.deployPath}/
expect {
    \\"Enter passphrase for key\\" {
        send \\"${config.server.passphrase}\\r\\"
        expect eof
    }
    eof {
        # rsync完成
    }
    timeout {
        exit 1
    }
}
"`;
        } else {
            rsyncCommand = `rsync ${config.rsync.options} ${excludeParams} -e "ssh ${sshOptions}" ${distPath} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;
        }

        console.log('🚀 执行rsync同步...');
        execSync(rsyncCommand, {
            stdio: 'inherit',
            shell: '/bin/bash'
        });

        console.log('✅ 构建文件同步完成');
        return true;
    } catch (error) {
        console.error('❌ 同步构建文件失败:', error.message);
        return false;
    }
}

// 同步sitemap文件
function syncSitemapFiles() {
    try {
        console.log('🗺️ 同步sitemap文件...');

        const sitemapFiles = [
            'public/sitemap.xml',
            'public/sitemap-index.xml'
        ];

        sitemapFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const sshOptions = generateSSHOptions();
                let scpCommand;

                if (config.server.passphrase) {
                    // 使用expect处理密码
                    scpCommand = `expect -c "
set timeout 30
spawn scp ${sshOptions.replace('-o ConnectTimeout=10', '')} ${file} ${config.server.username}@${config.server.host}:${config.server.deployPath}/
expect {
    \\"Enter passphrase for key\\" {
        send \\"${config.server.passphrase}\\r\\"
        expect eof
    }
    eof {
        # scp完成
    }
    timeout {
        exit 1
    }
}
"`;
                } else {
                    scpCommand = `scp ${sshOptions.replace('-o ConnectTimeout=10', '')} ${file} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;
                }

                execSync(scpCommand, {
                    stdio: 'pipe',
                    shell: '/bin/bash'
                });
                console.log(`  ✅ ${file} 已同步`);
            } else {
                console.warn(`  ⚠️ ${file} 不存在，跳过`);
            }
        });

        console.log('✅ Sitemap文件同步完成');
        return true;
    } catch (error) {
        console.error('❌ 同步sitemap文件失败:', error.message);
        return false;
    }
}

// 验证部署结果
function validateDeployment() {
    try {
        console.log('🧪 验证部署结果...');

        const checkCommands = [
            'ls -la',
            'find . -name "*.html" | wc -l',
            'ls -la sitemap.xml'
        ];

        checkCommands.forEach(cmd => {
            try {
                const command = `cd ${config.server.deployPath} && ${cmd}`;
                const result = executeSSHCommand(command, {
                    stdio: 'pipe'
                });

                if (cmd.includes('wc -l')) {
                    console.log(`  📄 HTML文件数量: ${result.toString().trim()}`);
                } else if (cmd.includes('sitemap.xml')) {
                    console.log(`  🗺️ Sitemap文件: ${result.toString().includes('sitemap.xml') ? '存在' : '不存在'}`);
                }
            } catch (error) {
                console.warn(`  ⚠️ 验证命令失败: ${cmd}`);
            }
        });

        console.log('✅ 部署验证完成');
        return true;
    } catch (error) {
        console.error('❌ 部署验证失败:', error.message);
        return false;
    }
}

// 主同步函数
export async function syncToServer(changes) {
    try {
        console.log('📤 开始同步到服务器...');

        // 1. 检查SSH连接
        if (!checkSSHConnection()) {
            throw new Error('SSH连接失败，无法同步到服务器');
        }

        // 2. 确保服务器目录存在
        if (!ensureServerDirectories()) {
            throw new Error('无法创建服务器目录');
        }

        // 3. 同步构建文件
        if (!syncBuildFiles()) {
            throw new Error('同步构建文件失败');
        }

        // 4. 同步sitemap文件
        if (!syncSitemapFiles()) {
            console.warn('⚠️ Sitemap同步失败，但继续部署');
        }

        // 5. 验证部署结果
        validateDeployment();

        console.log('✅ 服务器同步完成');

        return {
            success: true,
            syncedFiles: changes.blog.length + (changes.assets ? changes.assets.length : 0),
            serverPath: config.server.deployPath
        };

    } catch (error) {
        console.error('❌ 服务器同步失败:', error.message);
        throw error;
    }
}

// 测试服务器连接（独立函数）
export async function testServerConnection() {
    console.log('🧪 测试服务器连接...');

    try {
        const isConnected = checkSSHConnection();

        if (isConnected) {
            console.log('✅ 服务器连接测试通过');

            // 测试目录权限
            try {
                const command = `ls -la ${config.server.deployPath}`;
                const result = executeSSHCommand(command, {
                    stdio: 'pipe'
                });

                console.log('📁 服务器目录状态:');
                console.log(result.toString());
            } catch (error) {
                console.warn('⚠️ 无法访问部署目录，可能需要先创建');
            }

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('❌ 服务器连接测试失败:', error.message);
        return false;
    }
}