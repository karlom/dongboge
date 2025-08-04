#!/bin/bash

# 服务器诊断脚本
# 用于诊断服务器部署问题

echo "🔍 开始服务器诊断..."

# 检查参数
if [ $# -lt 3 ]; then
    echo "使用方法: $0 <服务器IP> <用户名> <SSH密钥路径>"
    exit 1
fi

SERVER_IP=$1
USERNAME=$2
SSH_KEY=$3

echo "📡 连接服务器进行诊断: $USERNAME@$SERVER_IP"

# 执行诊断
ssh -i "$SSH_KEY" "$USERNAME@$SERVER_IP" << 'EOF'
    echo "=== 系统信息 ==="
    uname -a
    echo ""
    
    echo "=== 磁盘使用情况 ==="
    df -h
    echo ""
    
    echo "=== 内存使用情况 ==="
    free -h
    echo ""
    
    echo "=== 进程状态 ==="
    ps aux | grep -E "(nginx|node|dongboge)" | grep -v grep
    echo ""
    
    echo "=== 服务状态 ==="
    sudo systemctl status nginx --no-pager -l
    echo ""
    sudo systemctl status dongboge --no-pager -l
    echo ""
    
    echo "=== 端口监听 ==="
    sudo netstat -tlnp | grep -E "(80|443|3000)"
    echo ""
    
    echo "=== 日志检查 ==="
    echo "Nginx错误日志:"
    sudo tail -10 /var/log/nginx/error.log
    echo ""
    
    echo "应用日志:"
    if [ -f /var/www/dongboge/logs/server.log ]; then
        tail -10 /var/www/dongboge/logs/server.log
    else
        echo "应用日志文件不存在"
    fi
    
    echo "✅ 诊断完成"
EOF

echo "🎉 诊断脚本执行完成"