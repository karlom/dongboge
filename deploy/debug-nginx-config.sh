#!/bin/bash

# Nginx配置调试脚本
# 用于检查服务器上的Nginx配置状态

echo "🔍 Nginx配置调试信息"
echo "===================="

# 检查当前工作目录
echo "📁 当前工作目录: $(pwd)"

# 检查部署目录结构
echo ""
echo "📂 部署目录结构:"
ls -la /var/www/dongboge/ | head -10

# 检查deploy目录
echo ""
echo "📂 Deploy目录内容:"
if [ -d "/var/www/dongboge/deploy" ]; then
    ls -la /var/www/dongboge/deploy/ | grep nginx
else
    echo "❌ deploy目录不存在"
fi

# 检查Nginx配置文件
echo ""
echo "📄 当前Nginx配置文件:"
if [ -f "/etc/nginx/sites-available/dongboge.conf" ]; then
    echo "✅ 配置文件存在"
    echo "📝 配置文件内容（root指令）:"
    grep -n "root " /etc/nginx/sites-available/dongboge.conf || echo "未找到root指令"
    
    echo ""
    echo "📝 配置文件修改时间:"
    ls -la /etc/nginx/sites-available/dongboge.conf
else
    echo "❌ 配置文件不存在"
fi

# 检查软链接
echo ""
echo "🔗 Nginx软链接状态:"
if [ -L "/etc/nginx/sites-enabled/dongboge.conf" ]; then
    echo "✅ 软链接存在"
    ls -la /etc/nginx/sites-enabled/dongboge.conf
else
    echo "❌ 软链接不存在"
fi

# 检查备份文件
echo ""
echo "💾 备份文件列表:"
ls -la /etc/nginx/sites-available/dongboge.conf.backup.* 2>/dev/null | tail -5 || echo "没有备份文件"

# 检查Nginx进程和配置
echo ""
echo "🔧 Nginx服务状态:"
sudo systemctl is-active nginx && echo "✅ Nginx运行中" || echo "❌ Nginx未运行"

echo ""
echo "🧪 Nginx配置测试:"
sudo nginx -t 2>&1

# 检查可用的配置文件
echo ""
echo "📋 可用的配置文件:"
for conf_file in nginx-working.conf nginx-fixed-routing.conf nginx-server-mode.conf nginx.conf; do
    if [ -f "/var/www/dongboge/deploy/$conf_file" ]; then
        echo "✅ $conf_file 存在"
        echo "   Root指令: $(grep "root " /var/www/dongboge/deploy/$conf_file || echo "未找到")"
    else
        echo "❌ $conf_file 不存在"
    fi
done

# 检查目录权限
echo ""
echo "🔐 目录权限检查:"
echo "dongboge目录: $(ls -ld /var/www/dongboge/ | awk '{print $1, $3, $4}')"
if [ -d "/var/www/dongboge/client" ]; then
    echo "client目录: $(ls -ld /var/www/dongboge/client/ | awk '{print $1, $3, $4}')"
else
    echo "❌ client目录不存在"
fi

# 检查当前用户权限
echo ""
echo "👤 当前用户信息:"
echo "用户: $(whoami)"
echo "用户组: $(groups)"
echo "Sudo权限: $(sudo -n true 2>/dev/null && echo "✅ 有权限" || echo "❌ 无权限")"

echo ""
echo "🎯 建议操作:"
echo "1. 如果nginx-working.conf存在但配置未更新，手动运行:"
echo "   sudo ./deploy/deploy-nginx-config.sh"
echo ""
echo "2. 如果需要强制更新配置:"
echo "   sudo cp deploy/nginx-working.conf /etc/nginx/sites-available/dongboge.conf"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "3. 检查部署脚本是否正确传输了配置文件"