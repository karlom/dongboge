#!/bin/bash

# 路由问题诊断脚本

echo "🔍 诊断路由问题..."

echo "1. 检查Node.js服务器状态:"
ps aux | grep "node.*server/entry.mjs" | grep -v grep || echo "❌ Node.js服务器未运行"

echo ""
echo "2. 检查端口3000是否被监听:"
netstat -tlnp | grep :3000 || echo "❌ 端口3000未被监听"

echo ""
echo "3. 检查Nginx配置:"
sudo nginx -t

echo ""
echo "4. 检查当前Nginx配置文件:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "5. 测试本地Node.js服务器响应:"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/contact || echo "❌ 无法连接到Node.js服务器"

echo ""
echo "6. 检查服务器日志:"
if [ -f "/var/www/dongboge/server.log" ]; then
    echo "最近的服务器日志:"
    tail -10 /var/www/dongboge/server.log
else
    echo "❌ 服务器日志文件不存在"
fi

echo ""
echo "7. 检查构建文件结构:"
echo "客户端文件:"
ls -la /var/www/dongboge/ | head -10
echo ""
echo "服务端文件:"
ls -la /var/www/dongboge/server/ | head -10

echo ""
echo "8. 测试Nginx路由:"
echo "测试静态首页:"
curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/
echo ""
echo "测试contact页面:"
curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/contact

echo ""
echo "🔍 诊断完成"