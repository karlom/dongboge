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
        deployPath: '/var/www/dongboge/client'
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

// 检查SSH连接
function checkSSHConnection() {
    try {
        console.log('🔐 检查SSH连接...');

        const sshCommand = `ssh -o ConnectTimeout=10 -o BatchMode=yes ${config.server.username}@${config.server.host} -p ${config.server.port} "echo 'SSH连接成功'"`;

        execSync(sshCommand, {
            stdio: 'pipe',
            timeout: 15000
        });

        console.log('✅ SSH连接正常');
        return true;
    } catch (error) {
        console.error('❌ SSH连接失败:', error.message);
        return false;
    }
}

// 确保服务器目录存在
function ensureServerDirectories() {
    try {
        console.log('📁 确保服务器目录存在...');

        const sshCommand = `ssh ${config.server.username}@${config.server.host} -p ${config.server.port} "mkdir -p ${config.server.deployPath} && chmod 755 ${config.server.deployPath}"`;

        execSync(sshCommand, {
            stdio: 'inherit'
        });

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

        // 使用rsync同步文件
        const rsyncCommand = `rsync ${config.rsync.options} ${excludeParams} -e "ssh -p ${config.server.port}" ${distPath} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

        console.log('🚀 执行rsync同步...');
        execSync(rsyncCommand, {
            stdio: 'inherit'
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
                const scpCommand = `scp -P ${config.server.port} ${file} ${config.server.username}@${config.server.host}:${config.server.deployPath}/`;

                execSync(scpCommand, {
                    stdio: 'pipe'
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
            const sshCommand = `ssh ${config.server.username}@${config.server.host} -p ${config.server.port} "cd ${config.server.deployPath} && ${cmd}"`;

            try {
                const result = execSync(sshCommand, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });

                if (cmd.includes('wc -l')) {
                    console.log(`  📄 HTML文件数量: ${result.trim()}`);
                } else if (cmd.includes('sitemap.xml')) {
                    console.log(`  🗺️ Sitemap文件: ${result.includes('sitemap.xml') ? '存在' : '不存在'}`);
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
            const sshCommand = `ssh ${config.server.username}@${config.server.host} -p ${config.server.port} "ls -la ${config.server.deployPath}"`;

            const result = execSync(sshCommand, {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            console.log('📁 服务器目录状态:');
            console.log(result);

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('❌ 服务器连接测试失败:', error.message);
        return false;
    }
}