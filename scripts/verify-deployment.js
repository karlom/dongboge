#!/usr/bin/env node

/**
 * 部署验证脚本
 * 用于检查服务器部署状态并修复常见问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置信息
const config = {
    serverHost: process.env.SERVER_HOST || '请设置SERVER_HOST环境变量',
    serverUser: process.env.SERVER_USER || '请设置SERVER_USER环境变量',
    serverPath: '/var/www/dongboge',
    serverPort: process.env.SERVER_PORT || '22'
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

/**
 * 执行SSH命令
 * @param {string} command 要执行的命令
 * @returns {string} 命令输出
 */
function executeSSH(command) {
    try {
        const sshCommand = `ssh -p ${config.serverPort} ${config.serverUser}@${config.serverHost} "${command}"`;
        console.log(`${colors.blue}执行命令:${colors.reset} ${sshCommand}`);
        return execSync(sshCommand, { encoding: 'utf8' });
    } catch (error) {
        console.error(`${colors.red}命令执行失败:${colors.reset} ${error.message}`);
        return error.stdout || '';
    }
}

/**
 * 检查目录结构
 */
function checkDirectoryStructure() {
    console.log(`\n${colors.cyan}=== 检查服务器目录结构 ===${colors.reset}`);

    // 检查基本目录
    const baseDir = executeSSH(`ls -la ${config.serverPath}`);
    console.log(`${colors.yellow}基本目录:${colors.reset}\n${baseDir}`);

    // 检查server/pages目录
    console.log(`\n${colors.cyan}=== 检查pages目录结构 ===${colors.reset}`);
    const pagesDir = executeSSH(`ls -la ${config.serverPath}/server/pages 2>/dev/null || echo "目录不存在"`);

    if (pagesDir.includes('目录不存在')) {
        console.log(`${colors.red}pages目录不存在，创建目录...${colors.reset}`);
        executeSSH(`mkdir -p ${config.serverPath}/server/pages`);
        executeSSH(`mkdir -p ${config.serverPath}/server/pages/admin`);
        executeSSH(`mkdir -p ${config.serverPath}/server/pages/api`);
        executeSSH(`mkdir -p ${config.serverPath}/server/pages/blog`);
        console.log(`${colors.green}✅ 目录已创建${colors.reset}`);
    } else {
        console.log(`${colors.yellow}pages目录:${colors.reset}\n${pagesDir}`);
    }
}

/**
 * 检查进程状态
 */
function checkProcessStatus() {
    console.log(`\n${colors.cyan}=== 检查服务器进程 ===${colors.reset}`);

    const processes = executeSSH(`ps aux | grep 'node.*server/entry.mjs' | grep -v grep || echo "没有找到Node.js进程"`);
    console.log(`${colors.yellow}Node.js进程:${colors.reset}\n${processes}`);

    if (processes.includes('没有找到Node.js进程')) {
        console.log(`${colors.red}没有找到Node.js进程，尝试重启...${colors.reset}`);
        executeSSH(`cd ${config.serverPath} && nohup node server/entry.mjs > logs/server.log 2>&1 &`);

        // 等待进程启动
        console.log(`${colors.yellow}等待进程启动...${colors.reset}`);
        setTimeout(() => {
            const newProcesses = executeSSH(`ps aux | grep 'node.*server/entry.mjs' | grep -v grep || echo "没有找到Node.js进程"`);
            if (!newProcesses.includes('没有找到Node.js进程')) {
                console.log(`${colors.green}✅ Node.js进程已重启成功${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ Node.js进程重启失败${colors.reset}`);
            }
        }, 3000);
    }
}

/**
 * 检查日志文件
 */
function checkLogs() {
    console.log(`\n${colors.cyan}=== 检查服务器日志 ===${colors.reset}`);

    const logs = executeSSH(`tail -20 ${config.serverPath}/logs/server.log 2>/dev/null || echo "日志文件不存在"`);

    if (logs.includes('日志文件不存在')) {
        console.log(`${colors.red}日志文件不存在，创建日志目录...${colors.reset}`);
        executeSSH(`mkdir -p ${config.serverPath}/logs && touch ${config.serverPath}/logs/server.log`);
        console.log(`${colors.green}✅ 日志目录已创建${colors.reset}`);
    } else {
        console.log(`${colors.yellow}最近的日志:${colors.reset}\n${logs}`);
    }
}

/**
 * 检查服务可用性
 */
function checkServiceAvailability() {
    console.log(`\n${colors.cyan}=== 检查服务可用性 ===${colors.reset}`);

    // 检查本地服务
    const localResponse = executeSSH(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR"`);
    console.log(`${colors.yellow}本地响应:${colors.reset} ${localResponse}`);

    // 检查外部服务
    const externalResponse = executeSSH(`curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/ 2>/dev/null || echo "ERROR"`);
    console.log(`${colors.yellow}外部响应:${colors.reset} ${externalResponse}`);

    if (localResponse !== '200' || externalResponse !== '200') {
        console.log(`${colors.red}⚠️ 服务可能不可用，检查更多信息...${colors.reset}`);

        // 检查Nginx状态
        const nginxStatus = executeSSH(`sudo systemctl status nginx | head -20`);
        console.log(`${colors.yellow}Nginx状态:${colors.reset}\n${nginxStatus}`);

        // 检查端口监听情况
        const portStatus = executeSSH(`netstat -tlnp | grep :3000 || echo "端口3000未被监听"`);
        console.log(`${colors.yellow}端口监听情况:${colors.reset}\n${portStatus}`);

        // 尝试重启Nginx
        console.log(`${colors.yellow}尝试重启Nginx...${colors.reset}`);
        executeSSH(`sudo systemctl restart nginx`);
    } else {
        console.log(`${colors.green}✅ 服务正常运行${colors.reset}`);
    }
}

/**
 * 修复rsync错误
 */
function fixRsyncErrors() {
    console.log(`\n${colors.cyan}=== 修复rsync错误 ===${colors.reset}`);

    console.log(`${colors.yellow}创建必要的目录结构...${colors.reset}`);
    executeSSH(`
    mkdir -p ${config.serverPath}/server/pages
    mkdir -p ${config.serverPath}/server/pages/admin
    mkdir -p ${config.serverPath}/server/pages/api
    mkdir -p ${config.serverPath}/server/pages/blog
    sudo chown -R $USER:$USER ${config.serverPath}
    chmod -R 755 ${config.serverPath}
  `);

    console.log(`${colors.green}✅ 目录结构已修复${colors.reset}`);
}

/**
 * 主函数
 */
function main() {
    console.log(`${colors.magenta}===== 部署验证工具 =====${colors.reset}`);
    console.log(`服务器: ${config.serverUser}@${config.serverHost}:${config.serverPort}`);
    console.log(`部署路径: ${config.serverPath}`);

    // 检查环境变量
    if (config.serverHost.includes('请设置') || config.serverUser.includes('请设置')) {
        console.error(`${colors.red}错误: 请设置SERVER_HOST和SERVER_USER环境变量${colors.reset}`);
        console.log(`使用方法: SERVER_HOST=your.server.com SERVER_USER=username node scripts/verify-deployment.js`);
        process.exit(1);
    }

    // 执行检查
    checkDirectoryStructure();
    checkProcessStatus();
    checkLogs();
    checkServiceAvailability();

    // 询问是否修复rsync错误
    console.log(`\n${colors.cyan}是否要修复rsync错误? (y/n)${colors.reset}`);
    process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
            fixRsyncErrors();
        }
        process.exit(0);
    });
}

// 执行主函数
main();