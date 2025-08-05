#!/bin/bash

# 统一的Nginx配置更新脚本
# 基于部署脚本中的Nginx配置逻辑

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/dongboge.conf"
BACKUP_CONF="/etc/nginx/sites-available/dongboge.conf.backup.$(date +%Y%m%d-%H%M%S)"
DEPLOY_DIR="/var/www/dongboge"

echo -e "${BLUE}🔧 开始更新Nginx配置...${NC}"

# 检查是否在正确的目录
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${RED}❌ 部署目录不存在: $DEPLOY_DIR${NC}"
    exit 1
fi

cd "$DEPLOY_DIR"

# 检查是否有sudo权限
if ! sudo -n true 2>/dev/null; then
    echo -e "${RED}❌ 需要sudo权限来更新Nginx配置${NC}"
    exit 1
fi

# 备份现有配置
if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}💾 备份现有Nginx配置...${NC}"
    sudo cp "$NGINX_CONF" "$BACKUP_CONF"
    echo -e "${GREEN}✅ 配置已备份到: $BACKUP_CONF${NC}"
fi

# 检查是否有部署的Nginx配置文件
NGINX_CONFIG_FILE=""
if [ -f "deploy/nginx-working.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-working.conf"
    echo -e "${GREEN}📁 找到工作配置文件（最高优先级）${NC}"
elif [ -f "deploy/nginx-fixed-routing.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-fixed-routing.conf"
    echo -e "${GREEN}📁 找到固定路由配置文件${NC}"
elif [ -f "deploy/nginx-server-mode.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx-server-mode.conf"
    echo -e "${GREEN}📁 找到服务器模式配置文件${NC}"
elif [ -f "deploy/nginx.conf" ]; then
    NGINX_CONFIG_FILE="deploy/nginx.conf"
    echo -e "${GREEN}📁 找到默认配置文件${NC}"
else
    echo -e "${YELLOW}⚠️ 未找到预设配置文件，创建标准配置...${NC}"
    NGINX_CONFIG_FILE="deploy/nginx-generated.conf"
    
    # 创建标准Nginx配置
    cat > "$NGINX_CONFIG_FILE" << 'EOF'
# 标准Nginx配置 - 支持混合架构
server {
    listen 80;
    server_name dongboge.cn www.dongboge.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dongboge.cn www.dongboge.cn;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/dongboge.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dongboge.cn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # 网站根目录
    root /var/www/dongboge/client;
    index index.html;

    # 基本安全头
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # 基本Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 动态页面路由（优先级最高）
    # API端点
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 管理后台
    location ^~ /admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 联系表单页面（精确匹配）
    location = /contact {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 静态资源文件（高优先级）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
        access_log off;
    }

    # 静态HTML页面和其他内容
    location / {
        # 首先尝试静态文件
        try_files $uri $uri/ $uri.html =404;
        
        # 缓存静态HTML文件
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public";
        }
    }

    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /var/www/dongboge;
    }
}
EOF
    echo -e "${GREEN}✅ 标准配置文件已创建${NC}"
fi

# 复制配置文件
echo -e "${YELLOW}📝 更新Nginx配置文件...${NC}"
sudo cp "$NGINX_CONFIG_FILE" "$NGINX_CONF"
echo -e "${GREEN}✅ 配置文件已复制到: $NGINX_CONF${NC}"

# 创建软链接
echo -e "${YELLOW}🔗 创建配置软链接...${NC}"
sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
echo -e "${GREEN}✅ 软链接已创建: $NGINX_ENABLED${NC}"

# 测试Nginx配置
echo -e "${YELLOW}🧪 测试Nginx配置...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
else
    echo -e "${RED}❌ Nginx配置测试失败，恢复备份配置...${NC}"
    if [ -f "$BACKUP_CONF" ]; then
        sudo cp "$BACKUP_CONF" "$NGINX_CONF"
        sudo nginx -t && sudo systemctl reload nginx
        echo -e "${YELLOW}⚠️ 已恢复到备份配置${NC}"
    fi
    exit 1
fi

# 重新加载Nginx
echo -e "${YELLOW}🔄 重新加载Nginx...${NC}"
if sudo systemctl reload nginx; then
    echo -e "${GREEN}✅ Nginx已重新加载${NC}"
else
    echo -e "${RED}❌ Nginx重新加载失败${NC}"
    exit 1
fi

# 检查Nginx状态
echo -e "${YELLOW}🔍 检查Nginx服务状态...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx服务运行正常${NC}"
else
    echo -e "${RED}❌ Nginx服务异常${NC}"
    sudo systemctl status nginx
    exit 1
fi

# 验证配置效果
echo -e "${YELLOW}🧪 验证配置效果...${NC}"
sleep 2

# 检查端口监听
if netstat -tlnp | grep :443 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS端口443正在监听${NC}"
else
    echo -e "${YELLOW}⚠️ HTTPS端口443未监听${NC}"
fi

if netstat -tlnp | grep :80 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTP端口80正在监听${NC}"
else
    echo -e "${YELLOW}⚠️ HTTP端口80未监听${NC}"
fi

# 测试网站响应
echo -e "${YELLOW}🌐 测试网站响应...${NC}"
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/ 2>/dev/null || echo "ERROR")
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://dongboge.cn/ 2>/dev/null || echo "ERROR")

echo -e "${BLUE}📊 响应测试结果:${NC}"
echo -e "${BLUE}  - HTTPS响应: $HTTPS_RESPONSE${NC}"
echo -e "${BLUE}  - HTTP响应: $HTTP_RESPONSE (应该是301重定向)${NC}"

if [ "$HTTPS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS访问正常${NC}"
else
    echo -e "${YELLOW}⚠️ HTTPS访问异常: $HTTPS_RESPONSE${NC}"
fi

if [ "$HTTP_RESPONSE" = "301" ]; then
    echo -e "${GREEN}✅ HTTP重定向正常${NC}"
else
    echo -e "${YELLOW}⚠️ HTTP重定向异常: $HTTP_RESPONSE${NC}"
fi

echo -e "${GREEN}🎉 Nginx配置更新完成！${NC}"
echo -e "${BLUE}📋 配置总结：${NC}"
echo -e "${BLUE}  - 配置文件: $NGINX_CONF${NC}"
echo -e "${BLUE}  - 备份文件: $BACKUP_CONF${NC}"
echo -e "${BLUE}  - 源配置: $NGINX_CONFIG_FILE${NC}"
echo -e "${BLUE}  - 网站根目录: /var/www/dongboge/client${NC}"
echo -e "${BLUE}  - 代理服务: 127.0.0.1:3000${NC}"

# 显示当前配置的关键信息
echo -e "${BLUE}🔍 当前配置关键信息：${NC}"
echo -e "${BLUE}  - SSL证书路径: /etc/letsencrypt/live/dongboge.cn/${NC}"
echo -e "${BLUE}  - 动态路由: /api/, /admin/, /contact${NC}"
echo -e "${BLUE}  - 静态文件缓存: 1年${NC}"
echo -e "${BLUE}  - HTML文件缓存: 1小时${NC}"

echo -e "${GREEN}✅ 脚本执行完成！${NC}"