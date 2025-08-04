#!/bin/bash

# 快速修复路由问题

echo "🔧 快速修复路由问题..."

cd /var/www/dongboge

echo "1. 停止当前Node.js进程..."
pkill -f "node.*server/entry.mjs" || echo "没有运行的进程"

echo "2. 检查服务器文件是否存在..."
if [ ! -f "server/entry.mjs" ]; then
    echo "❌ 服务器入口文件不存在"
    exit 1
fi

echo "3. 更新Nginx配置..."
if [ -f "deploy/nginx-fixed-routing.conf" ]; then
    sudo cp deploy/nginx-fixed-routing.conf /etc/nginx/sites-available/dongboge.conf
    sudo ln -sf /etc/nginx/sites-available/dongboge.conf /etc/nginx/sites-enabled/dongboge.conf
    echo "✅ Nginx配置已更新"
else
    echo "⚠️ 使用现有Nginx配置"
fi

echo "4. 测试Nginx配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx配置测试失败"
    exit 1
fi

echo "5. 重启Node.js服务器..."
nohup node server/entry.mjs > server.log 2>&1 &
sleep 3

echo "6. 检查服务器启动状态..."
if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
    echo "✅ Node.js服务器启动成功"
    
    # 测试服务器响应
    echo "7. 测试服务器响应..."
    sleep 2
    if curl -s -f http://127.0.0.1:3000/contact > /dev/null; then
        echo "✅ Node.js服务器响应正常"
    else
        echo "⚠️ Node.js服务器响应异常"
        echo "服务器日志:"
        tail -10 server.log
    fi
else
    echo "❌ Node.js服务器启动失败"
    echo "错误日志:"
    tail -10 server.log
    exit 1
fi

echo "8. 重载Nginx..."
sudo systemctl reload nginx

echo "✅ 路由修复完成！"

echo ""
echo "测试结果:"
echo "首页: $(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/)"
echo "Contact页面: $(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/contact)"