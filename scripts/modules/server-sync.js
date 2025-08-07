/**
 * 服务器同步模块（使用成功的SSH连接方法）
 * 将构建后的文件同步到服务器
 */

import fs from 'fs';
import path from 'path';
import {
    execSync
} from 'child_process';

// 手动加载.env文件（仅在本地环境）
function loadEnvFile() {
    // 在CI/CD环境中不加载.env文件，使用GitHub Secrets
    if (process.env.GITHUB_ACTIONS) {
        console.log('🔧 CI/CD环境，使用GitHub Secrets');
        return;
    }

    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        console.log('🔧 本地环境，加载.env文件');
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

// 配置
const config = {
    server: {
        host: process.env.HOST,
        username: process.env.USERNAME,
        port: process.env.PORT || '22',
        deployPath: '/var/www/dongboge/client',
        // SSH认证配置 - 优先使用GitHub Secrets
        keyPath: process.env.SSH_KEY_PATH || '~/.ssh/id_rsa', // 本地环境fallback
        passphrase: process.env.SSH_PASSPHRASE || '',
        // CI/CD环境使用SSH_PRIVATE_KEY（GitHub Secrets）
        keyContent: process.env.SSH_PRIVATE_KEY || ''
    },
    rsync: {
        options: '-rltzv',
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

// 设置SSH环境（使用ssh-agent方案）
function setupSSHEnvironment() {
    try {
        console.log('🔐 设置SSH环境（ssh-agent方案）...');
        console.log(`🔍 环境检查: GITHUB_ACTIONS=${process.env.GITHUB_ACTIONS}`);
        console.log(`🔍 密钥内容长度: ${config.server.keyContent ? config.server.keyContent.length : 0}`);
        console.log(`🔍 密钥密码: ${config.server.passphrase ? '已设置' : '未设置'}`);

        // 如果提供了密钥内容（CI/CD环境）
        if (config.server.keyContent) {
            console.log('📝 使用GitHub Secrets中的SSH密钥内容');

            // 验证密钥格式
            if (!config.server.keyContent.includes('BEGIN') || !config.server.keyContent.includes('END')) {
                throw new Error('SSH密钥格式不正确，缺少BEGIN/END标记');
            }

            // 确保.ssh目录存在
            const sshDir = path.join(process.env.HOME || '~', '.ssh');
            if (!fs.existsSync(sshDir)) {
                fs.mkdirSync(sshDir, {
                    mode: 0o700
                });
                console.log(`📁 创建SSH目录: ${sshDir}`);
            }

            // 写入密钥文件
            const keyPath = path.join(sshDir, 'deploy_key');

            // 确保密钥内容格式正确（添加换行符）
            let keyContent = config.server.keyContent.trim();
            if (!keyContent.endsWith('\n')) {
                keyContent += '\n';
            }

            fs.writeFileSync(keyPath, keyContent, {
                mode: 0o600
            });
            config.server.keyPath = keyPath;

            console.log(`✅ SSH密钥已写入: ${keyPath}`);
            console.log(`🔍 密钥文件大小: ${fs.statSync(keyPath).size} 字节`);
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
                throw new Error(`SSH密钥文件不存在: ${expandedKeyPath}`);
            }

            // 设置正确的权限
            const stats = fs.statSync(expandedKeyPath);
            const mode = (stats.mode & parseInt('777', 8)).toString(8);
            if (mode !== '600') {
                console.log('🔧 修正密钥文件权限为600...');
                fs.chmodSync(expandedKeyPath, 0o600);
            }

            config.server.keyPath = expandedKeyPath;
        }

        // === SSH-Agent方案实现 ===
        console.log('🔧 启动ssh-agent并加载密钥...');

        // 1. 启动ssh-agent
        console.log('🚀 启动ssh-agent...');
        const sshAgentOutput = execSync('ssh-agent -s', {
            stdio: 'pipe',
            encoding: 'utf8'
        });

        console.log('📋 ssh-agent输出:', sshAgentOutput.trim());

        // 2. 解析ssh-agent输出，获取环境变量
        const sshAuthSockMatch = sshAgentOutput.match(/SSH_AUTH_SOCK=([^;]+)/);
        const sshAgentPidMatch = sshAgentOutput.match(/SSH_AGENT_PID=([^;]+)/);

        if (!sshAuthSockMatch || !sshAgentPidMatch) {
            throw new Error('无法解析ssh-agent输出');
        }

        const sshAuthSock = sshAuthSockMatch[1];
        const sshAgentPid = sshAgentPidMatch[1];

        console.log(`✅ ssh-agent已启动:`);
        console.log(`  - SSH_AUTH_SOCK: ${sshAuthSock}`);
        console.log(`  - SSH_AGENT_PID: ${sshAgentPid}`);

        // 3. 创建expect脚本来自动输入密码
        const expectScriptPath = `/tmp/ssh_add_expect_${Date.now()}.exp`;
        const expectScript = `#!/usr/bin/expect -f
set timeout 10
spawn ssh-add ${config.server.keyPath}
expect {
    "Enter passphrase for*" {
        send "${config.server.passphrase}\\r"
        exp_continue
    }
    "Identity added*" {
        exit 0
    }
    "Bad passphrase*" {
        exit 1
    }
    timeout {
        exit 2
    }
    eof {
        exit 0
    }
}`;

        fs.writeFileSync(expectScriptPath, expectScript, {
            mode: 0o755
        });
        console.log(`📝 expect脚本已创建: ${expectScriptPath}`);

        // 4. 设置ssh-agent环境变量
        const sshAgentEnv = {
            ...process.env,
            SSH_AUTH_SOCK: sshAuthSock,
            SSH_AGENT_PID: sshAgentPid
        };

        // 4. 检查expect工具是否可用
        try {
            execSync('which expect', {
                stdio: 'pipe'
            });
            console.log('✅ expect工具可用');
        } catch (error) {
            console.log('⚠️ expect工具不可用，尝试安装...');
            try {
                execSync('sudo apt-get update && sudo apt-get install -y expect', {
                    stdio: 'pipe'
                });
                console.log('✅ expect工具安装成功');
            } catch (installError) {
                throw new Error('无法安装expect工具，ssh-agent方案需要expect');
            }
        }

        // 5. 使用expect脚本添加密钥到ssh-agent
        console.log('🔑 添加SSH密钥到ssh-agent...');
        try {
            const addKeyResult = execSync(`expect ${expectScriptPath}`, {
                stdio: 'pipe',
                env: sshAgentEnv,
                timeout: 15000
            });
            console.log('✅ SSH密钥已成功添加到ssh-agent');
            console.log('📤 ssh-add输出:', addKeyResult.toString().trim());
        } catch (error) {
            console.error('❌ 添加SSH密钥到ssh-agent失败:', error.message);
            if (error.stderr) {
                console.error('🔍 错误详情:', error.stderr.toString());
            }
            throw new Error('SSH密钥添加失败，可能是密码错误');
        }

        // 6. 验证密钥是否成功加载
        console.log('🧪 验证ssh-agent中的密钥...');
        try {
            const listKeysResult = execSync('ssh-add -l', {
                stdio: 'pipe',
                env: sshAgentEnv
            });
            console.log('✅ ssh-agent中的密钥列表:');
            console.log(listKeysResult.toString().trim());
        } catch (error) {
            console.warn('⚠️ 无法列出ssh-agent中的密钥，但继续尝试');
        }

        // 7. 设置环境变量（不再需要SSH_ASKPASS）
        config.server.sshEnv = sshAgentEnv;
        config.server.expectScriptPath = expectScriptPath;
        config.server.sshAgentPid = sshAgentPid;

        console.log('✅ ssh-agent环境设置完成');
        return true;

    } catch (error) {
        console.error('❌ SSH环境设置失败:', error.message);
        return false;
    }
}

// 清理SSH环境
function cleanupSSHEnvironment() {
    // 清理expect脚本
    if (config.server.expectScriptPath && fs.existsSync(config.server.expectScriptPath)) {
        try {
            fs.unlinkSync(config.server.expectScriptPath);
            console.log('🧹 expect脚本已清理');
        } catch (error) {
            console.warn('⚠️ 清理expect脚本失败');
        }
    }

    // 停止ssh-agent
    if (config.server.sshAgentPid) {
        try {
            execSync(`kill ${config.server.sshAgentPid}`, {
                stdio: 'pipe'
            });
            console.log('🧹 ssh-agent已停止');
        } catch (error) {
            console.warn('⚠️ 停止ssh-agent失败');
        }
    }
}

// 生成SSH命令选项（ssh-agent方案）
function generateSSHOptions() {
    // 使用ssh-agent时，不需要指定密钥文件，ssh-agent会自动处理
    const options = [
        '-o ConnectTimeout=10',
        '-o StrictHostKeyChecking=no',
        `-p ${config.server.port}`
        // 不再需要 -i 参数，ssh-agent会自动提供密钥
    ];

    return options.join(' ');
}

// 检查SSH连接（使用成功的方法）
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

        // 打印关键参数用于调试
        console.log('🔍 SSH连接测试参数（ssh-agent方案）:');
        console.log(`  - SSH命令: ${sshCommand}`);
        console.log(`  - SSH_AUTH_SOCK: ${config.server.sshEnv.SSH_AUTH_SOCK}`);
        console.log(`  - SSH_AGENT_PID: ${config.server.sshEnv.SSH_AGENT_PID}`);
        console.log(`  - 密钥文件权限: ${fs.statSync(config.server.keyPath).mode.toString(8)}`);

        // 使用ssh-agent方式
        const result = execSync(sshCommand, {
            stdio: 'pipe',
            timeout: 15000,
            env: config.server.sshEnv
        });

        console.log('✅ SSH连接正常');
        console.log('📤 连接输出:', result.toString().trim());
        return true;
    } catch (error) {
        console.error('❌ SSH连接失败:', error.message);

        // 显示详细的错误信息
        if (error.stderr) {
            console.error('🔍 SSH错误详情:', error.stderr.toString());
        }
        if (error.stdout) {
            console.error('🔍 SSH输出:', error.stdout.toString());
        }

        // 检查常见问题
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('permission denied')) {
            console.error('💡 可能的原因:');
            console.error('  1. 服务器上没有对应的公钥');
            console.error('  2. SSH密钥格式不正确');
            console.error('  3. SSH密钥密码错误');
        } else if (errorMsg.includes('libcrypto')) {
            console.error('💡 可能的原因:');
            console.error('  1. SSH密钥格式损坏');
            console.error('  2. 密钥文件权限问题');
            console.error('  3. 密钥内容复制时出现问题');
        }

        cleanupSSHEnvironment();
        return false;
    }
}

// 执行SSH命令（使用成功的方法）
function executeSSHCommand(command, options = {}) {
    const sshOptions = generateSSHOptions();
    const sshCommand = `ssh ${sshOptions} ${config.server.username}@${config.server.host} "${command}"`;

    return execSync(sshCommand, {
        stdio: options.stdio || 'inherit',
        timeout: options.timeout || 30000,
        env: config.server.sshEnv
    });
}

// 确保服务器目录存在
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

// 测试ssh-agent连接
function testSSHAgentConnection() {
    try {
        console.log('🧪 测试ssh-agent连接...');

        // 使用简单的rsync测试命令
        const sshOptions = generateSSHOptions();
        const testRsyncCommand = `rsync --dry-run -v -e "ssh ${sshOptions}" /tmp/ ${config.server.username}@${config.server.host}:/tmp/rsync_test/`;

        console.log(`🔍 测试rsync命令: ${testRsyncCommand}`);
        console.log(`🔍 使用ssh-agent环境变量:`);
        console.log(`  - SSH_AUTH_SOCK: ${config.server.sshEnv.SSH_AUTH_SOCK}`);
        console.log(`  - SSH_AGENT_PID: ${config.server.sshEnv.SSH_AGENT_PID}`);

        const result = execSync(testRsyncCommand, {
            stdio: 'pipe',
            timeout: 10000,
            env: config.server.sshEnv
        });

        console.log('✅ rsync ssh-agent测试成功');
        console.log(`📤 rsync输出: ${result.toString().trim()}`);
        return true;
    } catch (error) {
        console.error('❌ rsync ssh-agent测试失败:', error.message);
        if (error.stderr) {
            console.error('🔍 测试错误详情:', error.stderr.toString());
        }
        return false;
    }
}

// 测试SSH_ASKPASS是否能被rsync正确调用
function testSSHAskpassWithRsync() {
    try {
        console.log('🧪 测试rsync的SSH_ASKPASS调用...');

        // 创建一个测试用的SSH_ASKPASS脚本，记录调用日志
        const testAskpassPath = `/tmp/test_ssh_askpass_${Date.now()}.sh`;
        const testAskpassScript = `#!/bin/bash
echo "SSH_ASKPASS被调用: $(date)" >> /tmp/ssh_askpass_debug.log
echo "${config.server.passphrase}"`;

        fs.writeFileSync(testAskpassPath, testAskpassScript, {
            mode: 0o755
        });

        // 创建测试环境变量
        const testEnv = {
            ...config.server.sshEnv,
            SSH_ASKPASS: testAskpassPath
        };

        console.log(`🔍 测试SSH_ASKPASS脚本: ${testAskpassPath}`);
        console.log(`🔍 测试环境变量:`);
        console.log(`  - SSH_ASKPASS: ${testEnv.SSH_ASKPASS}`);
        console.log(`  - DISPLAY: ${testEnv.DISPLAY}`);
        console.log(`  - SSH_AUTH_SOCK: ${testEnv.SSH_AUTH_SOCK}`);

        // 使用简单的rsync测试命令
        const sshOptions = generateSSHOptions();
        const testRsyncCommand = `rsync --dry-run -v -e "ssh ${sshOptions}" /tmp/ ${config.server.username}@${config.server.host}:/tmp/rsync_test/`;

        console.log(`🔍 测试rsync命令: ${testRsyncCommand}`);

        const result = execSync(testRsyncCommand, {
            stdio: 'pipe',
            timeout: 10000,
            env: testEnv
        });

        console.log('✅ rsync SSH_ASKPASS测试成功');
        console.log(`📤 rsync输出: ${result.toString().trim()}`);

        // 检查SSH_ASKPASS是否被调用
        if (fs.existsSync('/tmp/ssh_askpass_debug.log')) {
            const debugLog = fs.readFileSync('/tmp/ssh_askpass_debug.log', 'utf8');
            console.log('📋 SSH_ASKPASS调用日志:');
            console.log(debugLog);
        } else {
            console.warn('⚠️ SSH_ASKPASS调用日志不存在，可能未被调用');
        }

        // 清理测试文件
        try {
            fs.unlinkSync(testAskpassPath);
            if (fs.existsSync('/tmp/ssh_askpass_debug.log')) {
                fs.unlinkSync('/tmp/ssh_askpass_debug.log');
            }
        } catch (e) {
            console.warn('⚠️ 清理测试文件失败');
        }

        return true;
    } catch (error) {
        console.error('❌ rsync SSH_ASKPASS测试失败:', error.message);
        if (error.stderr) {
            console.error('🔍 测试错误详情:', error.stderr.toString());
        }
        return false;
    }
}

// 验证环境变量传递
function debugEnvironmentVariables() {
    console.log('🔍 调试环境变量传递...');

    // 1. 检查当前进程环境变量
    console.log('📋 当前进程关键环境变量:');
    console.log(`  - HOME: ${process.env.HOME}`);
    console.log(`  - USER: ${process.env.USER}`);
    console.log(`  - SHELL: ${process.env.SHELL}`);
    console.log(`  - TERM: ${process.env.TERM}`);

    // 2. 检查SSH相关环境变量
    console.log('📋 SSH相关环境变量:');
    console.log(`  - SSH_ASKPASS: ${config.server.sshEnv.SSH_ASKPASS}`);
    console.log(`  - DISPLAY: ${config.server.sshEnv.DISPLAY}`);
    console.log(`  - SSH_AUTH_SOCK: ${config.server.sshEnv.SSH_AUTH_SOCK}`);

    // 3. 验证SSH_ASKPASS脚本
    if (config.server.sshEnv.SSH_ASKPASS && fs.existsSync(config.server.sshEnv.SSH_ASKPASS)) {
        console.log('✅ SSH_ASKPASS脚本存在');
        const askpassContent = fs.readFileSync(config.server.sshEnv.SSH_ASKPASS, 'utf8');
        console.log('📋 SSH_ASKPASS脚本内容:');
        console.log(askpassContent);

        // 检查脚本权限
        const stats = fs.statSync(config.server.sshEnv.SSH_ASKPASS);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        console.log(`🔍 SSH_ASKPASS脚本权限: ${mode}`);

        if (mode !== '755') {
            console.warn('⚠️ SSH_ASKPASS脚本权限不正确，应该是755');
        }
    } else {
        console.error('❌ SSH_ASKPASS脚本不存在或路径错误');
    }

    // 4. 测试密码是否正确
    console.log('🔍 检查密钥密码设置:');
    console.log(`  - 密码长度: ${config.server.passphrase ? config.server.passphrase.length : 0}`);
    console.log(`  - 密码是否为空: ${config.server.passphrase ? '否' : '是'}`);

    // 5. 验证密钥文件
    if (fs.existsSync(config.server.keyPath)) {
        console.log('✅ SSH密钥文件存在');
        const keyStats = fs.statSync(config.server.keyPath);
        const keyMode = (keyStats.mode & parseInt('777', 8)).toString(8);
        console.log(`🔍 SSH密钥文件权限: ${keyMode}`);
        console.log(`🔍 SSH密钥文件大小: ${keyStats.size} 字节`);

        // 读取密钥文件前几行检查格式
        const keyContent = fs.readFileSync(config.server.keyPath, 'utf8');
        const keyLines = keyContent.split('\n');
        console.log(`🔍 SSH密钥文件格式检查:`);
        console.log(`  - 第一行: ${keyLines[0]}`);
        console.log(`  - 最后一行: ${keyLines[keyLines.length - 2] || keyLines[keyLines.length - 1]}`);
        console.log(`  - 总行数: ${keyLines.length}`);
    } else {
        console.error('❌ SSH密钥文件不存在');
    }
}

// 同步构建文件到服务器（ssh-agent方案）
function syncBuildFiles() {
    try {
        console.log('📤 同步构建文件到服务器（ssh-agent方案）...');

        const distClientPath = 'dist/client/'; // 只同步client目录的内容
        const excludeParams = generateExcludeParams();

        // 检查dist/client目录是否存在
        if (!fs.existsSync(distClientPath)) {
            throw new Error('构建的client目录不存在，请先运行构建');
        }

        console.log(`📁 同步源目录: ${distClientPath}`);

        // 安全检查：确保部署路径是client目录
        if (!config.server.deployPath.endsWith('/client')) {
            throw new Error(`部署路径不安全: ${config.server.deployPath}，必须以/client结尾`);
        }

        console.log(`🔒 安全检查通过，部署到: ${config.server.deployPath}`);

        // === 调试信息: 测试ssh-agent连接 ===
        console.log('🔍 === 测试ssh-agent连接 ===');
        if (!testSSHAgentConnection()) {
            console.warn('⚠️ ssh-agent连接测试失败，但继续尝试正式同步');
        }

        // 使用ssh-agent方案，不需要指定密钥文件
        const sshOptions = generateSSHOptions();
        const rsyncCommand = `rsync ${config.rsync.options} ${excludeParams} -e "ssh ${sshOptions}" ${distClientPath} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

        console.log('🚀 执行rsync同步...');
        console.log(`🔍 rsync命令: ${rsyncCommand}`);
        console.log('🔍 使用ssh-agent进行认证');

        // 显示ssh-agent环境变量
        console.log('🔍 ssh-agent环境变量:');
        console.log(`  - SSH_AUTH_SOCK: ${config.server.sshEnv.SSH_AUTH_SOCK}`);
        console.log(`  - SSH_AGENT_PID: ${config.server.sshEnv.SSH_AGENT_PID}`);

        execSync(rsyncCommand, {
            stdio: 'inherit',
            env: config.server.sshEnv
        });

        console.log('✅ 构建文件同步完成');
        return true;
    } catch (error) {
        console.error('❌ 同步构建文件失败:', error.message);

        // 增强错误分析
        if (error.stderr) {
            console.error('🔍 rsync错误详情:', error.stderr.toString());
        }
        if (error.stdout) {
            console.error('🔍 rsync输出:', error.stdout.toString());
        }

        // 分析具体错误原因
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('permission denied')) {
            console.error('💡 Permission denied 错误分析:');
            console.error('  1. ssh-agent可能未正确启动');
            console.error('  2. SSH密钥可能未正确添加到ssh-agent');
            console.error('  3. 密钥密码可能不正确');
            console.error('  4. 服务器端公钥配置可能有问题');
        }

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
                // 使用ssh-agent方式
                const sshOptions = generateSSHOptions();
                const scpCommand = `scp ${sshOptions.replace('-o ConnectTimeout=10', '')} ${file} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

                console.log(`🔍 同步 ${file} 使用ssh-agent认证`);
                execSync(scpCommand, {
                    stdio: 'pipe',
                    env: config.server.sshEnv
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

        // 6. 清理SSH环境
        cleanupSSHEnvironment();

        console.log('✅ 服务器同步完成');

        return {
            success: true,
            syncedFiles: changes.blog.length + (changes.assets ? changes.assets.length : 0),
            serverPath: config.server.deployPath
        };

    } catch (error) {
        console.error('❌ 服务器同步失败:', error.message);
        cleanupSSHEnvironment();
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

            cleanupSSHEnvironment();
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('❌ 服务器连接测试失败:', error.message);
        cleanupSSHEnvironment();
        return false;
    }
}