#!/bin/bash

# 修复SEO文件访问问题的脚本
# 确保sitemap.xml和robots.txt能被正确访问

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"
BACKUP_CONF="/etc/nginx/sites-available/dongboge.conf.backup.$(date +%Y%m%d-%H%M%S)"
DEPLOY_DIR="/var/www/dongboge"
CLIENT_DIR="/var/www/dongboge/client"

echo -e "${BLUE}🔧 开始修复SEO文件访问问题...${NC}"

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

# 检查SEO文件是否存在
echo -e "${YELLOW}📋 检查SEO文件状态...${NC}"

if [ -f "$CLIENT_DIR/sitemap.xml" ]; then
    echo -e "${GREEN}✅ sitemap.xml 存在${NC}"
else
    echo -e "${RED}❌ sitemap.xml 不存在于 $CLIENT_DIR${NC}"
fi

if [ -f "$CLIENT_DIR/robots.txt" ]; then
    echo -e "${GREEN}✅ robots.txt 存在${NC}"
else
    echo -e "${RED}❌ robots.txt 不存在于 $CLIENT_DIR${NC}"
fi

if [ -f "$CLIENT_DIR/sitemap-index.xml" ]; then
    echo -e "${GREEN}✅ sitemap-index.xml 存在${NC}"
else
    echo -e "${RED}❌ sitemap-index.xml 不存在于 $CLIENT_DIR${NC}"
fi

# 备份现有配置
if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}💾 备份现有Nginx配置...${NC}"
    sudo cp "$NGINX_CONF" "$BACKUP_CONF"
    echo -e "${GREEN}✅ 配置已备份到: $BACKUP_CONF${NC}"
fi

# 创建修复后的nginx配置
echo -e "${YELLOW}📝 创建修复后的Nginx配置...${NC}"

cat > "deploy/nginx-seo-fixed.conf" << 'EOF'
# 修复SEO文件访问的Nginx配置
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

    # SEO文件特殊处理（最高优先级）
    location = /robots.txt {
        try_files $uri =404;
        add_header Content-Type text/plain;
        expires 1d;
        access_log off;
    }

    location = /sitemap.xml {
        try_files $uri =404;
        add_header Content-Type application/xml;
        expires 1d;
        access_log off;
    }

    location = /sitemap-index.xml {
        try_files $uri =404;
        add_header Content-Type application/xml;
        expires 1d;
        access_log off;
    }

    # RSS订阅文件
    location = /rss.xml {
        try_files $uri =404;
        add_header Content-Type application/xml;
        expires 1h;
        access_log off;
    }

    # 动态页面路由
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

echo -e "${GREEN}✅ 修复配置文件已创建${NC}"

# 复制配置文件
echo -e "${YELLOW}📝 更新Nginx配置文件...${NC}"
sudo cp "deploy/nginx-seo-fixed.conf" "$NGINX_CONF"
echo -e "${GREEN}✅ 配置文件已更新${NC}"

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

# 等待服务稳定
sleep 3

# 测试SEO文件访问
echo -e "${YELLOW}🧪 测试SEO文件访问...${NC}"

# 测试robots.txt
ROBOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/robots.txt 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  - robots.txt 响应: $ROBOTS_RESPONSE${NC}"

# 测试sitemap.xml
SITEMAP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/sitemap.xml 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  - sitemap.xml 响应: $SITEMAP_RESPONSE${NC}"

# 测试sitemap-index.xml
SITEMAP_INDEX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/sitemap-index.xml 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  - sitemap-index.xml 响应: $SITEMAP_INDEX_RESPONSE${NC}"

# 检查结果
SUCCESS_COUNT=0

if [ "$ROBOTS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ robots.txt 访问正常${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo -e "${RED}❌ robots.txt 访问异常: $ROBOTS_RESPONSE${NC}"
fi

if [ "$SITEMAP_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ sitemap.xml 访问正常${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo -e "${RED}❌ sitemap.xml 访问异常: $SITEMAP_RESPONSE${NC}"
fi

if [ "$SITEMAP_INDEX_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ sitemap-index.xml 访问正常${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo -e "${RED}❌ sitemap-index.xml 访问异常: $SITEMAP_INDEX_RESPONSE${NC}"
fi

# 显示内容预览
echo -e "${YELLOW}📄 文件内容预览...${NC}"

if [ "$ROBOTS_RESPONSE" = "200" ]; then
    echo -e "${BLUE}robots.txt 内容预览:${NC}"
    curl -s https://dongboge.cn/robots.txt 2>/dev/null | head -5 | sed 's/^/  /'
fi

if [ "$SITEMAP_RESPONSE" = "200" ]; then
    echo -e "${BLUE}sitemap.xml 内容预览:${NC}"
    curl -s https://dongboge.cn/sitemap.xml 2>/dev/null | head -10 | sed 's/^/  /'
fi

# 总结
echo -e "${GREEN}🎉 SEO文件访问修复完成！${NC}"
echo -e "${BLUE}📊 修复结果: $SUCCESS_COUNT/3 个文件访问正常${NC}"

if [ $SUCCESS_COUNT -eq 3 ]; then
    echo -e "${GREEN}✅ 所有SEO文件都可以正常访问了！${NC}"
    echo -e "${BLUE}📋 下一步建议：${NC}"
    echo -e "${BLUE}  1. 在Google Search Console中提交sitemap${NC}"
    echo -e "${BLUE}  2. 在百度搜索资源平台中提交sitemap${NC}"
    echo -e "${BLUE}  3. 验证搜索引擎能否正常抓取${NC}"
else
    echo -e "${YELLOW}⚠️ 部分文件仍有问题，请检查文件是否存在于 $CLIENT_DIR${NC}"
fi

echo -e "${BLUE}🔍 配置文件位置：${NC}"
echo -e "${BLUE}  - 当前配置: $NGINX_CONF${NC}"
echo -e "${BLUE}  - 备份配置: $BACKUP_CONF${NC}"
echo -e "${BLUE}  - 修复配置: deploy/nginx-seo-fixed.conf${NC}"

echo -e "${GREEN}✅ 脚本执行完成！${NC}"