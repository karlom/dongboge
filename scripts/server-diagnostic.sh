#!/bin/bash

# 服务器诊断和修复脚本
# 用于检查和修复部署后的服务器问题

set -e

echo "🔍 开始服务器诊断..."
echo "=================================="

# 检查当前目录
echo "📁 当前工作目录: $(pwd)"

# 检查文件结构
echo ""
echo "📂 检查文件结构..."
echo "=== 根目录内容 ==="
ls -la

echo ""
echo "=== server目录内容 ==="
if [ -d "server" ]; then
    ls -la server/
    echo "server/entry.mjs: $([ -f server/entry.mjs ] && echo '✅ 存在' || echo '❌ 缺失')"
else
    echo "❌ server目录不存在"
fi

echo ""
echo "=== server/pages目录内容 ==="
if [ -d "server/pages" ]; then
    ls -la server/pages/
    echo ".mjs文件数量: $(find server/pages -name '*.mjs' | wc -l)"
else
    echo "❌ server/pages目录不存在"
fi

# 检查package.json
echo ""
echo "📦 检查package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json存在"
    echo "项目名称: $(cat package.json | grep '"name"' | cut -d'"' -f4)"
else
    echo "❌ package.json缺失"
fi

# 检查环境变量
echo ""
echo "🌍 检查环境变量..."
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    echo "环境变量内容:"
    cat .env
else
    echo "❌ .env文件缺失，创建默认配置..."
    cat > .env << EOF
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF
    echo "✅ 已创建默认.env文件"
fi

# 检查Node.js和npm
echo ""
echo "🔧 检查运行环境..."
echo "Node.js版本: $(node --version)"
echo "npm版本: $(npm --version)"

# 检查依赖
echo ""
echo "📦 检查依赖安装..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules存在"
    echo "依赖数量: $(ls node_modules | wc -l)"
else
    echo "❌ node_modules缺失，安装依赖..."
    npm install --production
fi

# 检查PM2
echo ""
echo "🔄 检查PM2状态..."
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2已安装"
    echo "PM2版本: $(pm2 --version)"
    echo "PM2进程列表:"
    pm2 status || echo "PM2状态获取失败"
else
    echo "❌ PM2未安装，正在安装..."
    npm install -g pm2
    echo "✅ PM2安装完成"
fi

# 检查进程状态
echo ""
echo "🔍 检查Node.js进程..."
NODE_PROCESSES=$(ps aux | grep "node.*server/entry.mjs" | grep -v grep | wc -l)
echo "Node.js进程数量: $NODE_PROCESSES"

if [ "$NODE_PROCESSES" -gt 0 ]; then
    echo "✅ Node.js服务正在运行"
    ps aux | grep "node.*server/entry.mjs" | grep -v grep
else
    echo "❌ Node.js服务未运行"
fi

# 检查端口监听
echo ""
echo "🔌 检查端口监听..."
PORT_3000=$(netstat -tlnp 2>/dev/null | grep :3000 | wc -l)
echo "端口3000监听数量: $PORT_3000"

if [ "$PORT_3000" -gt 0 ]; then
    echo "✅ 端口3000正在监听"
    netstat -tlnp | grep :3000
else
    echo "❌ 端口3000未被监听"
fi

# 测试服务响应
echo ""
echo "🧪 测试服务响应..."
if [ "$PORT_3000" -gt 0 ]; then
    LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR")
    echo "本地响应: $LOCAL_RESPONSE"
    
    if [ "$LOCAL_RESPONSE" = "200" ]; then
        echo "✅ 本地服务响应正常"
    else
        echo "❌ 本地服务响应异常"
    fi
else
    echo "⚠️ 跳过响应测试（端口未监听）"
fi

# 检查日志
echo ""
echo "📋 检查服务日志..."
if [ -d "logs" ]; then
    echo "✅ logs目录存在"
    ls -la logs/
    
    if [ -f "logs/server.log" ]; then
        echo "最近的服务日志:"
        tail -10 logs/server.log
    fi
    
    if [ -f "logs/error.log" ]; then
        echo "最近的错误日志:"
        tail -5 logs/error.log
    fi
else
    echo "❌ logs目录不存在，创建中..."
    mkdir -p logs
fi

# 修复建议
echo ""
echo "🔧 修复建议..."
echo "=================================="

if [ ! -f "server/entry.mjs" ]; then
    echo "❌ 关键问题：server/entry.mjs文件缺失"
    echo "   建议：重新部署项目"
fi

if [ "$NODE_PROCESSES" -eq 0 ]; then
    echo "❌ 关键问题：Node.js服务未运行"
    echo "   修复命令："
    echo "   1. 使用PM2启动: pm2 start server/entry.mjs --name dongboge"
    echo "   2. 或直接启动: nohup node server/entry.mjs > logs/server.log 2>&1 &"
fi

if [ "$PORT_3000" -eq 0 ]; then
    echo "❌ 关键问题：端口3000未监听"
    echo "   可能原因：服务启动失败或端口被占用"
    echo "   检查命令: netstat -tlnp | grep 3000"
fi

# 自动修复选项
echo ""
echo "🚀 自动修复选项..."
echo "=================================="

read -p "是否尝试自动启动服务？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 尝试启动服务..."
    
    # 停止现有进程
    echo "停止现有进程..."
    pm2 stop dongboge 2>/dev/null || true
    pm2 delete dongboge 2>/dev/null || true
    pkill -f "node.*server/entry.mjs" 2>/dev/null || true
    
    sleep 2
    
    # 启动服务
    if [ -f "server/entry.mjs" ]; then
        echo "启动新服务..."
        pm2 start server/entry.mjs --name dongboge --log logs/server.log --error logs/error.log --out logs/out.log
        pm2 save
        
        sleep 5
        
        # 检查启动结果
        if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
            echo "✅ 服务启动成功！"
            pm2 status dongboge
        else
            echo "❌ 服务启动失败，查看日志："
            pm2 logs dongboge --lines 10
        fi
    else
        echo "❌ 无法启动：server/entry.mjs文件不存在"
    fi
fi

echo ""
echo "🎯 诊断完成！"
echo "=================================="