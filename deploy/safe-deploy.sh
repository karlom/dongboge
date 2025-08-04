#!/bin/bash

# 安全部署脚本 - 包含回滚机制

set -e  # 遇到错误立即退出

echo "🚀 开始安全部署..."

# 变量定义
DEPLOY_DIR="/var/www/dongboge"
BACKUP_DIR="/var/www/dongboge-backup-$(date +%Y%m%d-%H%M%S)"
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
NGINX_BACKUP="/tmp/nginx-dongboge-backup.conf"

# 函数：回滚操作
rollback() {
    echo "❌ 部署失败，开始回滚..."
    
    # 恢复Nginx配置
    if [ -f "$NGINX_BACKUP" ]; then
        sudo cp "$NGINX_BACKUP" "$NGINX_CONF"
        echo "✅ Nginx配置已回滚"
    fi
    
    # 恢复文件
    if [ -d "$BACKUP_DIR" ]; then
        sudo rm -rf "$DEPLOY_DIR"
        sudo mv "$BACKUP_DIR" "$DEPLOY_DIR"
        echo "✅ 文件已回滚"
    fi
    
    # 重启服务
    sudo systemctl reload nginx
    echo "✅ 回滚完成"
    exit 1
}

# 设置错误处理
trap rollback ERR

echo "📦 创建备份..."
if [ -d "$DEPLOY_DIR" ]; then
    sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    echo "✅ 备份创建完成: $BACKUP_DIR"
fi

echo "🔧 备份Nginx配置..."
if [ -f "$NGINX_CONF" ]; then
    sudo cp "$NGINX_CONF" "$NGINX_BACKUP"
    echo "✅ Nginx配置备份完成"
fi

echo "📝 更新Nginx配置..."
cd "$DEPLOY_DIR"
if [ -f "nginx-config.conf" ]; then
    # 测试新配置
    sudo nginx -t -c "$PWD/nginx-config.conf" || {
        echo "❌ Nginx配置测试失败"
        exit 1
    }
    
    # 应用新配置
    sudo cp nginx-config.conf "$NGINX_CONF"
    sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/dongboge.conf
    echo "✅ Nginx配置更新成功"
else
    echo "⚠️ 未找到新的Nginx配置，保持现有配置"
fi

echo "🔄 设置环境变量..."
cat > .env << EOF
PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF

echo "🚀 启动Node.js服务器..."
# 停止旧进程
pkill -f "node.*server/entry.mjs" || echo "没有运行的服务器进程"

# 检查服务器文件是否存在
if [ ! -f "server/entry.mjs" ]; then
    echo "❌ 服务器入口文件不存在"
    exit 1
fi

# 启动新进程
nohup node server/entry.mjs > server.log 2>&1 &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 5

# 检查服务器是否启动成功
if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Node.js服务器启动失败"
    echo "错误日志:"
    tail -20 server.log || echo "无法读取日志文件"
    exit 1
fi

echo "✅ Node.js服务器启动成功 (PID: $SERVER_PID)"

echo "🔄 重载Nginx..."
sudo nginx -t || {
    echo "❌ Nginx配置测试失败"
    exit 1
}

sudo systemctl reload nginx || {
    echo "❌ Nginx重载失败"
    exit 1
}

echo "🧹 清理备份..."
# 只保留最近3个备份
cd /var/www
ls -dt dongboge-backup-* 2>/dev/null | tail -n +4 | xargs sudo rm -rf

echo "✅ 部署成功完成！"
echo "服务器状态:"
ps aux | grep "node.*server/entry.mjs" | grep -v grep || echo "服务器进程未找到"