#!/bin/bash

# 基于verify-pm2-service.sh逻辑的服务启动脚本
# 用于部署时启动服务，确保服务能正常启动在3000端口

echo "🔍 开始启动服务..."

# 定义变量
APP_NAME="dongboge"
DEPLOY_DIR="/var/www/dongboge"
LOG_DIR="${DEPLOY_DIR}/logs"
ENTRY_FILE="${DEPLOY_DIR}/server/entry.mjs"

# 切换到部署目录
cd "$DEPLOY_DIR" || {
    echo "❌ 无法切换到部署目录: $DEPLOY_DIR"
    exit 1
}

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 检查PM2是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2未安装，正在安装..."
    npm install -g pm2
    echo "✅ PM2安装完成"
fi

# 检查.env文件中的端口配置
if [ -f "$DEPLOY_DIR/.env" ]; then
    echo "📄 从.env文件读取端口配置..."
    PORT=$(grep -E "^PORT=" "$DEPLOY_DIR/.env" | cut -d= -f2)
    HOST=$(grep -E "^HOST=" "$DEPLOY_DIR/.env" | cut -d= -f2)
    
    # 如果没有找到PORT，使用默认值
    if [ -z "$PORT" ]; then
        echo "⚠️ 在.env中未找到PORT配置，使用默认端口3000"
        PORT=3000
    fi
    
    # 如果没有找到HOST，使用默认值
    if [ -z "$HOST" ]; then
        echo "⚠️ 在.env中未找到HOST配置，使用默认127.0.0.1"
        HOST="127.0.0.1"
    fi
else
    echo "⚠️ .env文件不存在，使用默认端口3000和HOST 127.0.0.1"
    PORT=3000
    HOST="127.0.0.1"
fi

echo "🔧 使用配置: HOST=$HOST, PORT=$PORT"

# 更新.env文件中的端口配置
echo "📝 更新.env文件中的端口配置..."
# 检测操作系统类型，为macOS适配sed命令
if [[ "$(uname)" == "Darwin" ]]; then
    # macOS版本
    grep -q "^PORT=" "$DEPLOY_DIR/.env" && sed -i '' "s/^PORT=.*/PORT=$PORT/" "$DEPLOY_DIR/.env" || echo "PORT=$PORT" >> "$DEPLOY_DIR/.env"
    grep -q "^HOST=" "$DEPLOY_DIR/.env" && sed -i '' "s/^HOST=.*/HOST=$HOST/" "$DEPLOY_DIR/.env" || echo "HOST=$HOST" >> "$DEPLOY_DIR/.env"
else
    # Linux版本
    grep -q "^PORT=" "$DEPLOY_DIR/.env" && sed -i "s/^PORT=.*/PORT=$PORT/" "$DEPLOY_DIR/.env" || echo "PORT=$PORT" >> "$DEPLOY_DIR/.env"
    grep -q "^HOST=" "$DEPLOY_DIR/.env" && sed -i "s/^HOST=.*/HOST=$HOST/" "$DEPLOY_DIR/.env" || echo "HOST=$HOST" >> "$DEPLOY_DIR/.env"
fi
echo "✅ .env文件已更新"

# 检查服务器入口文件是否存在
if [ ! -f "$ENTRY_FILE" ]; then
    echo "❌ 服务器入口文件不存在: $ENTRY_FILE"
    exit 1
fi

# 检查PM2是否已启动服务
PM2_STATUS=$(pm2 list | grep "$APP_NAME" | wc -l)

if [ "$PM2_STATUS" -gt 0 ]; then
    echo "🔄 发现已有PM2服务正在运行，正在停止..."
    pm2 stop "$APP_NAME" > /dev/null 2>&1
    pm2 delete "$APP_NAME" > /dev/null 2>&1
    echo "✅ 已停止旧服务"
fi

# 检查是否有其他Node.js进程在运行服务
NODE_PIDS=$(ps aux | grep "node.*server/entry.mjs" | grep -v grep | awk '{print $2}')

if [ ! -z "$NODE_PIDS" ]; then
    echo "🔄 发现其他Node.js进程正在运行服务，正在停止..."
    for PID in $NODE_PIDS; do
        kill -15 "$PID" > /dev/null 2>&1 || true
        sleep 1
        kill -9 "$PID" > /dev/null 2>&1 || true
    done
    echo "✅ 已停止所有相关Node.js进程"
fi

# 检查端口是否被占用
PORT_STATUS=$(netstat -tlnp | grep ":$PORT" | wc -l)

if [ "$PORT_STATUS" -gt 0 ]; then
    echo "⚠️ 端口 $PORT 已被占用，尝试释放..."
    PORT_PIDS=$(netstat -tlnp | grep ":$PORT" | awk '{print $7}' | cut -d/ -f1)
    for PID in $PORT_PIDS; do
        kill -15 "$PID" > /dev/null 2>&1 || true
        sleep 1
        kill -9 "$PID" > /dev/null 2>&1 || true
    done
    echo "✅ 端口已释放"
fi

# 设置环境变量
echo "🔧 设置环境变量 PORT=$PORT HOST=$HOST"
export PORT="$PORT"
export HOST="$HOST"

# 使用PM2启动服务
echo "🚀 使用PM2启动服务..."
PORT="$PORT" HOST="$HOST" pm2 start "$ENTRY_FILE" --name "$APP_NAME" --log "$LOG_DIR/server.log" --error "$LOG_DIR/error.log" --output "$LOG_DIR/out.log"
pm2 save

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 验证服务是否成功启动
if pm2 list | grep "$APP_NAME" | grep "online" > /dev/null; then
    echo "✅ PM2服务启动成功"
    
    # 检查端口是否在监听
    if netstat -tlnp | grep ":$PORT" > /dev/null; then
        echo "✅ 端口 $PORT 正在监听"
    else
        echo "❌ 端口 $PORT 未在监听"
        echo "📄 查看日志:"
        tail -10 "$LOG_DIR/server.log"
        exit 1
    fi
    
    # 测试服务响应
    echo "🧪 测试服务响应..."
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$HOST:$PORT/" 2>/dev/null || echo "ERROR")
    
    if [ "$RESPONSE" = "200" ]; then
        echo "🎉 服务响应正常 (HTTP 200)"
    else
        echo "⚠️ 服务响应异常 (HTTP $RESPONSE)"
        echo "📄 查看日志:"
        tail -10 "$LOG_DIR/server.log"
    fi
else
    echo "❌ PM2服务启动失败"
    echo "📄 查看日志:"
    tail -10 "$LOG_DIR/server.log"
    exit 1
fi

echo "📊 PM2进程状态:"
pm2 list

echo "🔍 服务启动完成"