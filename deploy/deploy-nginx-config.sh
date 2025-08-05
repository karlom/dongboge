#!/bin/bash

# 部署时的Nginx配置更新脚本
# 简化版本，专门用于部署流程中调用

set -e

echo "🔧 更新Nginx配置..."

# 配置变量
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/dongboge.conf"
DEPLOY_DIR="/var/www/dongboge"

# 确保在正确的目录
cd "$DEPLOY_DIR"

# 备份现有配置（如果存在）
if [ -f "$NGINX_CONF" ]; then
    echo "💾 备份现有Nginx配置..."
    sudo cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d-%H%M%S)"
fi

# 选择配置文件
NGINX_CONFIG_FILE=""
if [ -f "deploy/nginx-working.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-working.conf"
    echo "📁 使用工作配置（最高优先级）"
elif [ -f "deploy/nginx-fixed-routing.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-fixed-routing.conf"
    echo "📁 使用固定路由配置"
elif [ -f "deploy/nginx-server-mode.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-server-mode.conf"
    echo "📁 使用服务器模式配置"
elif [ -f "deploy/nginx.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx.conf"
    echo "📁 使用默认配置"
else
    echo "⚠️ 使用现有Nginx配置"
    exit 0
fi

# 更新配置文件
echo "📝 更新Nginx配置文件..."
sudo cp "$NGINX_CONFIG_FILE" "$NGINX_CONF"

# 创建软链接
echo "🔗 创建配置软链接..."
sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# 测试配置
echo "🧪 测试Nginx配置..."
if ! sudo nginx -t; then
    echo "❌ Nginx配置测试失败"
    exit 1
fi

echo "✅ Nginx配置更新完成"