#!/bin/bash

# 混合架构部署脚本
# 用于部署分离的客户端静态文件和服务端动态文件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置参数
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-your-server.com}"
SERVER_PORT="${SERVER_PORT:-22}"
DEPLOY_PATH="/var/www/dongboge"
BACKUP_PATH="$DEPLOY_PATH/backup"

# 检查必要的环境变量
if [ -z "$SERVER_HOST" ] || [ "$SERVER_HOST" = "your-server.com" ]; then
    echo -e "${RED}❌ 请设置 SERVER_HOST 环境变量${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 开始混合架构部署...${NC}"
echo -e "${BLUE}目标服务器: $SERVER_USER@$SERVER_HOST:$SERVER_PORT${NC}"
echo -e "${BLUE}部署路径: $DEPLOY_PATH${NC}"

# 函数：执行远程命令
run_remote() {
    ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "$1"
}

# 函数：上传文件
upload_files() {
    local source=$1
    local target=$2
    echo -e "${YELLOW}📤 上传 $source 到 $target${NC}"
    rsync -avz --delete -e "ssh -p $SERVER_PORT" "$source" "$SERVER_USER@$SERVER_HOST:$target"
}

# 1. 检查本地构建文件
echo -e "${YELLOW}🔍 检查本地构建文件...${NC}"
if [ ! -d "dist/client" ] || [ ! -d "dist/server" ]; then
    echo -e "${RED}❌ 构建文件不完整，请先运行 npm run build${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 本地构建文件检查通过${NC}"

# 2. 准备服务器环境
echo -e "${YELLOW}🔧 准备服务器环境...${NC}"
run_remote "
    set -e
    echo '📁 创建混合架构目录结构...'
    mkdir -p $DEPLOY_PATH/{server,client,logs,backup,node_modules}
    
    echo '🔐 设置目录权限...'
    chown -R \$USER:\$USER $DEPLOY_PATH
    chmod -R 755 $DEPLOY_PATH
    
    echo '💾 备份现有部署...'
    if [ -f '$DEPLOY_PATH/server/entry.mjs' ]; then
        tar -czf $BACKUP_PATH/backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C $DEPLOY_PATH server client package.json .env 2>/dev/null || echo '⚠️ 备份跳过'
        cd $BACKUP_PATH && ls -t backup-*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true
    fi
    
    echo '🛑 停止现有服务...'
    if command -v pm2 >/dev/null 2>&1; then
        pm2 stop dongboge 2>/dev/null || echo 'PM2服务未运行'
        pm2 delete dongboge 2>/dev/null || echo 'PM2应用不存在'
    fi
    
    # 强制停止Node.js进程
    pkill -f 'node.*server/entry.mjs' 2>/dev/null || echo '没有运行的Node.js进程'
    
    echo '✅ 服务器环境准备完成'
"

# 3. 上传客户端静态文件
echo -e "${YELLOW}📤 上传客户端静态文件...${NC}"
upload_files "dist/client/" "$DEPLOY_PATH/client/"

# 4. 上传服务端文件
echo -e "${YELLOW}📤 上传服务端文件...${NC}"
upload_files "dist/server/" "$DEPLOY_PATH/server/"

# 5. 上传配置文件
echo -e "${YELLOW}📤 上传配置文件...${NC}"
if [ -f "dist/package.json" ]; then
    scp -P $SERVER_PORT "dist/package.json" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
fi

# 6. 设置环境变量和启动服务
echo -e "${YELLOW}🚀 设置环境变量和启动服务...${NC}"
run_remote "
    set -e
    cd $DEPLOY_PATH
    
    echo '📦 安装生产依赖...'
    npm install --production --silent
    
    echo '🔧 设置环境变量...'
    cat > .env << 'EOF'
PUBLIC_SUPABASE_URL=\${PUBLIC_SUPABASE_URL}
PUBLIC_SUPABASE_ANON_KEY=\${PUBLIC_SUPABASE_ANON_KEY}
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF
    
    echo '🔍 验证关键文件...'
    if [ ! -f 'server/entry.mjs' ]; then
        echo '❌ server/entry.mjs 文件不存在！'
        ls -la server/ || echo 'server目录不存在'
        exit 1
    fi
    
    echo '🚀 启动服务...'
    mkdir -p logs
    
    # 安装PM2（如果不存在）
    if ! command -v pm2 >/dev/null 2>&1; then
        echo '📦 安装PM2...'
        npm install -g pm2
    fi
    
    # 使用PM2启动服务
    pm2 start server/entry.mjs --name dongboge --log logs/server.log --error logs/error.log --out logs/out.log
    pm2 save
    
    # 等待服务启动
    sleep 5
    
    echo '🧪 验证服务状态...'
    if ps aux | grep 'node.*server/entry.mjs' | grep -v grep > /dev/null; then
        echo '✅ 服务启动成功！'
        pm2 status dongboge
        
        # 检查端口监听
        if netstat -tlnp | grep :3000 > /dev/null; then
            echo '✅ 端口3000正在监听'
            
            # 测试本地响应
            sleep 3
            LOCAL_RESPONSE=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ 2>/dev/null || echo 'ERROR')
            echo '本地响应: \$LOCAL_RESPONSE'
            
            if [ '\$LOCAL_RESPONSE' = '200' ]; then
                echo '🎉 混合架构部署完全成功！'
            else
                echo '⚠️ 服务启动但响应异常'
                tail -10 logs/server.log
            fi
        else
            echo '❌ 端口3000未监听'
            pm2 logs dongboge --lines 10
        fi
    else
        echo '❌ 服务启动失败'
        pm2 logs dongboge --lines 10
        exit 1
    fi
"

echo -e "${GREEN}🎉 混合架构部署完成！${NC}"
echo -e "${BLUE}📋 部署总结：${NC}"
echo -e "${BLUE}  - 静态文件部署到: $DEPLOY_PATH/client/${NC}"
echo -e "${BLUE}  - 动态服务部署到: $DEPLOY_PATH/server/${NC}"
echo -e "${BLUE}  - Nginx应该指向: $DEPLOY_PATH/client/ (静态文件)${NC}"
echo -e "${BLUE}  - Node.js服务运行在: 127.0.0.1:3000${NC}"