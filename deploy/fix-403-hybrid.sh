#!/bin/bash

# 快速修复403错误 - 混合架构版本
# 在服务器上运行此脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 快速修复403错误 - 混合架构版本${NC}"

DEPLOY_PATH="/var/www/dongboge"

# 1. 检查目录结构
echo -e "${YELLOW}🔍 检查目录结构...${NC}"
echo "当前目录结构："
ls -la $DEPLOY_PATH/

# 2. 确保混合架构目录存在
echo -e "${YELLOW}📁 确保混合架构目录存在...${NC}"
mkdir -p $DEPLOY_PATH/{client,server,logs,backup}

# 3. 检查文件分布
echo -e "${YELLOW}🔍 检查文件分布...${NC}"
echo "Client目录内容："
ls -la $DEPLOY_PATH/client/ 2>/dev/null || echo "Client目录为空或不存在"

echo "Server目录内容："
ls -la $DEPLOY_PATH/server/ 2>/dev/null || echo "Server目录为空或不存在"

# 4. 如果文件在根目录，移动到正确位置
if [ -f "$DEPLOY_PATH/index.html" ] && [ ! -f "$DEPLOY_PATH/client/index.html" ]; then
    echo -e "${YELLOW}📦 检测到文件在根目录，正在重新组织...${NC}"
    
    # 移动静态文件到client目录
    echo "移动静态文件到client目录..."
    find $DEPLOY_PATH -maxdepth 1 -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" -o -name "*.ico" -o -name "*.woff*" -o -name "*.ttf" -o -name "*.eot" \) -exec mv {} $DEPLOY_PATH/client/ \;
    
    # 移动静态目录到client目录
    for dir in assets _astro images css js; do
        if [ -d "$DEPLOY_PATH/$dir" ]; then
            echo "移动目录 $dir 到client/"
            mv "$DEPLOY_PATH/$dir" "$DEPLOY_PATH/client/"
        fi
    done
    
    # 移动服务端文件到server目录
    if [ -f "$DEPLOY_PATH/entry.mjs" ]; then
        echo "移动服务端文件到server目录..."
        mv "$DEPLOY_PATH/entry.mjs" "$DEPLOY_PATH/server/"
    fi
    
    # 移动server相关目录
    for dir in pages chunks; do
        if [ -d "$DEPLOY_PATH/$dir" ]; then
            echo "移动目录 $dir 到server/"
            mv "$DEPLOY_PATH/$dir" "$DEPLOY_PATH/server/"
        fi
    done
fi

# 5. 设置正确的权限
echo -e "${YELLOW}🔐 设置正确的权限...${NC}"
chown -R $USER:$USER $DEPLOY_PATH
chmod -R 755 $DEPLOY_PATH

# 6. 检查Nginx配置
echo -e "${YELLOW}🔍 检查Nginx配置...${NC}"
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
if [ -f "$NGINX_CONF" ]; then
    if grep -q "root /var/www/dongboge/client" "$NGINX_CONF"; then
        echo -e "${GREEN}✅ Nginx配置已指向client目录${NC}"
    else
        echo -e "${YELLOW}⚠️ Nginx配置需要更新${NC}"
        echo "当前root配置："
        grep "root " "$NGINX_CONF" || echo "未找到root配置"
        
        echo -e "${BLUE}建议运行以下命令更新Nginx配置：${NC}"
        echo "sudo sed -i 's|root /var/www/dongboge[^;]*|root /var/www/dongboge/client|g' $NGINX_CONF"
        echo "sudo nginx -t && sudo systemctl reload nginx"
    fi
else
    echo -e "${RED}❌ Nginx配置文件不存在: $NGINX_CONF${NC}"
fi

# 7. 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
if [ -f "$DEPLOY_PATH/server/entry.mjs" ]; then
    echo -e "${GREEN}✅ 服务端文件存在${NC}"
    
    # 检查Node.js进程
    if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
        echo -e "${GREEN}✅ Node.js服务正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️ Node.js服务未运行，尝试启动...${NC}"
        cd $DEPLOY_PATH
        
        # 安装依赖
        if [ -f "package.json" ]; then
            npm install --production --silent
        fi
        
        # 启动服务
        if command -v pm2 >/dev/null 2>&1; then
            pm2 start server/entry.mjs --name dongboge --log logs/server.log
        else
            nohup node server/entry.mjs > logs/server.log 2>&1 &
        fi
        
        sleep 3
        if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
            echo -e "${GREEN}✅ Node.js服务启动成功${NC}"
        else
            echo -e "${RED}❌ Node.js服务启动失败${NC}"
            tail -10 logs/server.log 2>/dev/null || echo "无法读取日志"
        fi
    fi
else
    echo -e "${RED}❌ 服务端文件不存在: $DEPLOY_PATH/server/entry.mjs${NC}"
fi

# 8. 最终验证
echo -e "${YELLOW}🧪 最终验证...${NC}"
echo "=== 目录结构验证 ==="
echo "Client目录："
ls -la $DEPLOY_PATH/client/ | head -5
echo "Server目录："
ls -la $DEPLOY_PATH/server/ | head -5

echo "=== 权限验证 ==="
ls -ld $DEPLOY_PATH $DEPLOY_PATH/client $DEPLOY_PATH/server

echo "=== 服务验证 ==="
if netstat -tlnp | grep :3000 > /dev/null; then
    echo -e "${GREEN}✅ 端口3000正在监听${NC}"
else
    echo -e "${RED}❌ 端口3000未监听${NC}"
fi

# 测试本地响应
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR")
echo "本地服务响应: $LOCAL_RESPONSE"

echo -e "${GREEN}🎉 403错误修复脚本执行完成！${NC}"
echo -e "${BLUE}📋 修复总结：${NC}"
echo -e "${BLUE}  - 静态文件位置: $DEPLOY_PATH/client/${NC}"
echo -e "${BLUE}  - 动态服务位置: $DEPLOY_PATH/server/${NC}"
echo -e "${BLUE}  - 确保Nginx root指向: $DEPLOY_PATH/client${NC}"
echo -e "${BLUE}  - 确保Node.js服务运行在: 127.0.0.1:3000${NC}"

if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo -e "${GREEN}🎉 服务运行正常！${NC}"
else
    echo -e "${YELLOW}⚠️ 可能还需要手动检查Nginx配置和服务状态${NC}"
fi