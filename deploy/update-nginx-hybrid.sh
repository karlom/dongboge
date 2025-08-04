#!/bin/bash

# 更新Nginx配置以支持混合架构
# 需要在服务器上运行

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 更新Nginx配置以支持混合架构...${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用root权限运行此脚本${NC}"
    exit 1
fi

# 备份现有配置
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
BACKUP_CONF="/etc/nginx/sites-available/dongboge.conf.backup.$(date +%Y%m%d-%H%M%S)"

if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}💾 备份现有Nginx配置...${NC}"
    cp "$NGINX_CONF" "$BACKUP_CONF"
    echo -e "${GREEN}✅ 配置已备份到: $BACKUP_CONF${NC}"
fi

# 创建新的混合架构配置
echo -e "${YELLOW}📝 创建混合架构Nginx配置...${NC}"
cat > "$NGINX_CONF" << 'EOF'
# 混合架构Nginx配置 - 静态文件 + 动态服务
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

    # 静态文件根目录 - 指向client目录
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
        root /var/www/dongboge/client;
    }
}
EOF

# 测试Nginx配置
echo -e "${YELLOW}🧪 测试Nginx配置...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    
    # 重新加载Nginx
    echo -e "${YELLOW}🔄 重新加载Nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx已重新加载${NC}"
    
    # 检查Nginx状态
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✅ Nginx服务运行正常${NC}"
    else
        echo -e "${RED}❌ Nginx服务异常${NC}"
        systemctl status nginx
    fi
else
    echo -e "${RED}❌ Nginx配置测试失败，恢复备份配置...${NC}"
    if [ -f "$BACKUP_CONF" ]; then
        cp "$BACKUP_CONF" "$NGINX_CONF"
        nginx -t && systemctl reload nginx
        echo -e "${YELLOW}⚠️ 已恢复到备份配置${NC}"
    fi
    exit 1
fi

echo -e "${GREEN}🎉 混合架构Nginx配置更新完成！${NC}"
echo -e "${BLUE}📋 配置总结：${NC}"
echo -e "${BLUE}  - 静态文件根目录: /var/www/dongboge/client${NC}"
echo -e "${BLUE}  - 动态服务代理: 127.0.0.1:3000${NC}"
echo -e "${BLUE}  - 配置文件: $NGINX_CONF${NC}"
echo -e "${BLUE}  - 备份文件: $BACKUP_CONF${NC}"