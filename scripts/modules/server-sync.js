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

// 设置SSH环境（使用成功的方法）
function setupSSHEnvironment() {
    try {
        console.log('🔐 设置SSH环境...');
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

        // 创建SSH_ASKPASS脚本（使用成功的方法）
        const askpassPath = `/tmp/ssh_askpass_${Date.now()}.sh`;
        const askpassScript = `#!/bin/bash\necho "${config.server.passphrase}"`;
        fs.writeFileSync(askpassPath, askpassScript, {
            mode: 0o755
        });

        // 不再创建SSH配置文件，统一使用SSH_ASKPASS方式
        console.log('📝 统一使用SSH_ASKPASS环境变量进行认证');

        // 设置SSH环境变量
        config.server.sshEnv = {
            ...process.env,
            SSH_ASKPASS: askpassPath,
            DISPLAY: ':0',
            SSH_AUTH_SOCK: '' // 禁用SSH agent
        };

        config.server.askpassPath = askpassPath;

        return true;
    } catch (error) {
        console.error('❌ SSH环境设置失败:', error.message);
        return false;
    }
}

// 清理SSH环境
function cleanupSSHEnvironment() {
    if (config.server.askpassPath && fs.existsSync(config.server.askpassPath)) {
        try {
            fs.unlinkSync(config.server.askpassPath);
        } catch (error) {
            console.warn('⚠️ 清理SSH askpass文件失败');
        }
    }

    // SSH配置文件已不再使用，无需清理
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
        console.log('🔍 SSH连接测试参数:');
        console.log(`  - SSH命令: ${sshCommand}`);
        console.log(`  - SSH_ASKPASS: ${config.server.sshEnv.SSH_ASKPASS}`);
        console.log(`  - DISPLAY: ${config.server.sshEnv.DISPLAY}`);
        console.log(`  - SSH_AUTH_SOCK: ${config.server.sshEnv.SSH_AUTH_SOCK}`);
        console.log(`  - 密钥文件权限: ${fs.statSync(config.server.keyPath).mode.toString(8)}`);

        // 使用SSH_ASKPASS方式（与appleboy/ssh-action相同）
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

        // === 调试信息 1: 验证rsync执行时的环境变量 ===
        console.log('🔍 === 调试信息 1: 验证环境变量 ===');
        debugEnvironmentVariables();

        // === 调试信息 2: 测试rsync是否能正确调用SSH_ASKPASS ===
        console.log('🔍 === 调试信息 2: 测试rsync SSH_ASKPASS调用 ===');
        if (!testSSHAskpassWithRsync()) {
            console.warn('⚠️ rsync SSH_ASKPASS测试失败，但继续尝试正式同步');
        }

        // === 调试信息 3: 检查密钥密码是否正确传递 ===
        console.log('🔍 === 调试信息 3: 验证密钥密码传递 ===');
        console.log('🧪 手动测试SSH_ASKPASS脚本执行...');
        try {
            const manualTestResult = execSync(`bash ${config.server.sshEnv.SSH_ASKPASS}`, {
                stdio: 'pipe',
                timeout: 5000
            });
            console.log(`✅ SSH_ASKPASS脚本手动执行成功: "${manualTestResult.toString().trim()}"`);
            console.log(`🔍 返回的密码长度: ${manualTestResult.toString().trim().length}`);
        } catch (error) {
            console.error('❌ SSH_ASKPASS脚本手动执行失败:', error.message);
        }

        // 统一使用SSH_ASKPASS方式，与SSH连接测试保持一致
        const sshOptions = generateSSHOptions();
        const rsyncCommand = `rsync ${config.rsync.options} ${excludeParams} -e "ssh ${sshOptions}" ${distPath} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

        console.log('🚀 执行rsync同步...');
        console.log(`🔍 rsync命令: ${rsyncCommand}`);
        console.log('🔍 使用SSH_ASKPASS环境变量进行认证');

        // 添加更详细的环境变量调试
        console.log('🔍 rsync执行环境变量:');
        Object.keys(config.server.sshEnv).forEach(key => {
            if (key.includes('SSH') || key === 'DISPLAY') {
                console.log(`  - ${key}: ${config.server.sshEnv[key]}`);
            }
        });

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
            console.error('  1. SSH_ASKPASS可能未被rsync正确调用');
            console.error('  2. 密钥密码可能不正确');
            console.error('  3. rsync的SSH子进程可能无法访问环境变量');
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
                // 统一使用SSH_ASKPASS方式
                const sshOptions = generateSSHOptions();
                const scpCommand = `scp ${sshOptions.replace('-o ConnectTimeout=10', '')} ${file} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

                console.log(`🔍 同步 ${file} 使用SSH_ASKPASS认证`);
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