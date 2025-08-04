#!/bin/bash

# 快速修复脚本 - 解决部署后服务器无响应问题
# 使用方法: ./scripts/quick-fix.sh

echo "🚀 开始快速修复..."

# 进入项目目录
cd /var/www/dongboge || {
    echo "❌ 无法进入项目目录 /var/www/dongboge"
    exit 1
}

echo "📁 当前目录: $(pwd)"

# 1. 检查关键文件
echo "🔍 检查关键文件..."
if [ ! -f "server/entry.mjs" ]; then
    echo "❌ 致命错误：server/entry.mjs 不存在！"
    echo "请检查部署是否成功完成。"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 致命错误：package.json 不存在！"
    exit 1
fi

echo "✅ 关键文件检查通过"

# 2. 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p backup

# 3. 停止所有相关进程
echo "🛑 停止现有服务..."
pm2 stop dongboge 2>/dev/null || echo "PM2服务未运行"
pm2 delete dongboge 2>/dev/null || echo "PM2应用不存在"

# 强制停止所有Node.js进程
for pid in $(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | awk '{print $2}'); do
    echo "停止进程 $pid"
    kill -15 $pid 2>/dev/null || true
    sleep 1
    kill -9 $pid 2>/dev/null || true
done

echo "✅ 进程清理完成"

# 4. 安装PM2（如果需要）
if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 5. 确保依赖已安装
echo "📦 检查依赖..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "安装生产依赖..."
    npm install --production --silent
fi

# 6. 设置环境变量
echo "🔧 设置环境变量..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF
    echo "✅ 已创建默认.env文件"
fi

# 7. 启动服务
echo "🚀 启动服务..."

# 方法1: 尝试PM2启动
echo "尝试使用PM2启动..."
pm2 start server/entry.mjs --name dongboge --log logs/server.log --error logs/error.log --out logs/out.log

# 等待启动
sleep 8

# 检查PM2状态
echo "检查PM2状态..."
pm2 status dongboge

# 检查进程是否运行
if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
    echo "✅ PM2启动成功！"
    
    # 保存PM2配置
    pm2 save
    
    # 设置PM2开机自启
    pm2 startup || echo "PM2 startup设置跳过"
    
else
    echo "⚠️ PM2启动失败，尝试直接启动..."
    
    # 查看PM2日志
    echo "PM2错误日志："
    pm2 logs dongboge --lines 5 || echo "无法获取PM2日志"
    
    # 方法2: 直接启动
    echo "使用nohup直接启动..."
    nohup node server/entry.mjs > logs/server.log 2>&1 &
    
    sleep 5
    
    if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
        echo "✅ 直接启动成功！"
    else
        echo "❌ 所有启动方法都失败了"
        echo "查看错误日志："
        tail -20 logs/server.log || echo "无法读取日志"
        exit 1
    fi
fi

# 8. 验证服务
echo "🧪 验证服务状态..."

# 检查端口监听
echo "检查端口监听..."
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ 端口3000正在监听"
else
    echo "❌ 端口3000未监听"
    echo "等待5秒后重试..."
    sleep 5
    if netstat -tlnp | grep :3000 > /dev/null; then
        echo "✅ 端口3000现在正在监听"
    else
        echo "❌ 端口3000仍未监听，可能存在问题"
    fi
fi

# 测试本地响应
echo "测试本地响应..."
sleep 3
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR")
echo "本地响应状态: $LOCAL_RESPONSE"

if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo "✅ 本地服务响应正常！"
else
    echo "❌ 本地服务响应异常"
    echo "可能的原因："
    echo "1. 服务仍在启动中"
    echo "2. 端口被其他进程占用"
    echo "3. 应用代码有错误"
    
    echo "查看最新日志："
    tail -10 logs/server.log || echo "无法读取日志"
fi

# 9. 更新Nginx配置（如果需要）
echo "🔧 检查Nginx配置..."
if [ -f "/etc/nginx/sites-available/dongboge.conf" ]; then
    echo "✅ Nginx配置文件存在"
    
    # 测试Nginx配置
    if sudo nginx -t 2>/dev/null; then
        echo "✅ Nginx配置语法正确"
        
        # 重载Nginx
        echo "重载Nginx配置..."
        sudo systemctl reload nginx
        echo "✅ Nginx重载完成"
    else
        echo "❌ Nginx配置有语法错误"
    fi
else
    echo "⚠️ Nginx配置文件不存在"
fi

# 10. 最终状态报告
echo ""
echo "📊 最终状态报告"
echo "=================================="
echo "进程状态: $(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | wc -l) 个进程"
echo "端口监听: $(netstat -tlnp 2>/dev/null | grep :3000 | wc -l) 个监听"
echo "本地响应: $LOCAL_RESPONSE"

# 测试外部访问
EXTERNAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/ 2>/dev/null || echo "ERROR")
echo "外部响应: $EXTERNAL_RESPONSE"

if [ "$LOCAL_RESPONSE" = "200" ] && [ "$EXTERNAL_RESPONSE" = "200" ]; then
    echo ""
    echo "🎉 修复成功！服务已正常运行"
    echo "✅ 本地服务: http://127.0.0.1:3000"
    echo "✅ 外部访问: https://dongboge.cn"
elif [ "$LOCAL_RESPONSE" = "200" ]; then
    echo ""
    echo "⚠️ 部分成功：本地服务正常，但外部访问可能有问题"
    echo "✅ 本地服务: http://127.0.0.1:3000"
    echo "❌ 外部访问: https://dongboge.cn"
    echo "建议检查Nginx配置和防火墙设置"
else
    echo ""
    echo "❌ 修复未完全成功，需要进一步排查"
    echo "建议运行: ./scripts/server-diagnostic.sh"
fi

echo ""
echo "🔧 常用管理命令："
echo "查看PM2状态: pm2 status"
echo "查看服务日志: pm2 logs dongboge"
echo "重启服务: pm2 restart dongboge"
echo "停止服务: pm2 stop dongboge"
echo "查看实时日志: tail -f logs/server.log"

echo ""
echo "修复完成！"