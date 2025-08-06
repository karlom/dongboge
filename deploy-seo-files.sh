#!/bin/bash

# 快速部署SEO文件到服务器
# 只上传SEO相关的文件，不影响其他内容

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置
SERVER_USER="root"
SERVER_HOST="dongboge.cn"
SERVER_PATH="/var/www/dongboge/client"

echo -e "${BLUE}🚀 开始部署SEO文件到服务器...${NC}"

# 检查本地文件
echo -e "${YELLOW}📋 检查本地SEO文件...${NC}"

SEO_FILES=(
    "public/robots.txt"
    "public/sitemap.xml"
    "public/sitemap-index.xml"
    "public/rss.xml"
)

for file in "${SEO_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file 存在 ($(wc -c < "$file") 字节)${NC}"
    else
        echo -e "${RED}❌ $file 不存在${NC}"
        exit 1
    fi
done

# 上传文件到服务器
echo -e "${YELLOW}📤 上传SEO文件到服务器...${NC}"

for file in "${SEO_FILES[@]}"; do
    filename=$(basename "$file")
    echo -e "${BLUE}上传 $filename...${NC}"
    
    if scp "$file" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/$filename"; then
        echo -e "${GREEN}✅ $filename 上传成功${NC}"
    else
        echo -e "${RED}❌ $filename 上传失败${NC}"
        exit 1
    fi
done

# 设置正确的文件权限
echo -e "${YELLOW}🔧 设置文件权限...${NC}"

ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
cd /var/www/dongboge/client
chmod 644 robots.txt sitemap.xml sitemap-index.xml rss.xml
chown www-data:www-data robots.txt sitemap.xml sitemap-index.xml rss.xml
echo "文件权限设置完成"
EOF

echo -e "${GREEN}✅ 文件权限设置完成${NC}"

# 等待文件生效
echo -e "${YELLOW}⏳ 等待文件生效...${NC}"
sleep 3

# 验证部署结果
echo -e "${YELLOW}🧪 验证部署结果...${NC}"

URLS=(
    "https://dongboge.cn/robots.txt"
    "https://dongboge.cn/sitemap.xml"
    "https://dongboge.cn/sitemap-index.xml"
    "https://dongboge.cn/rss.xml"
)

SUCCESS_COUNT=0
TOTAL_COUNT=${#URLS[@]}

for url in "${URLS[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "ERROR")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $url - $response${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}❌ $url - $response${NC}"
    fi
done

# 显示结果
echo -e "${BLUE}📊 部署结果: $SUCCESS_COUNT/$TOTAL_COUNT 文件可访问${NC}"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "${GREEN}🎉 所有SEO文件部署成功！${NC}"
    echo -e "${BLUE}📋 下一步：${NC}"
    echo -e "${BLUE}  1. 在Google Search Console中提交sitemap${NC}"
    echo -e "${BLUE}  2. 在百度搜索资源平台中提交sitemap${NC}"
    echo -e "${BLUE}  3. 查看 SEO-SUBMISSION-GUIDE.md 获取详细指南${NC}"
else
    echo -e "${YELLOW}⚠️ 部分文件部署失败，请检查服务器配置${NC}"
fi

echo -e "${GREEN}✅ SEO文件部署完成！${NC}"