#!/bin/bash

# SEO文件访问诊断脚本
# 检查sitemap.xml和robots.txt的访问状态

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 SEO文件访问诊断开始...${NC}"

# 检查本地文件
echo -e "${YELLOW}📁 检查本地文件状态...${NC}"

if [ -f "public/robots.txt" ]; then
    echo -e "${GREEN}✅ public/robots.txt 存在${NC}"
    echo -e "${BLUE}   文件大小: $(wc -c < public/robots.txt) 字节${NC}"
else
    echo -e "${RED}❌ public/robots.txt 不存在${NC}"
fi

if [ -f "public/sitemap.xml" ]; then
    echo -e "${GREEN}✅ public/sitemap.xml 存在${NC}"
    echo -e "${BLUE}   文件大小: $(wc -c < public/sitemap.xml) 字节${NC}"
else
    echo -e "${RED}❌ public/sitemap.xml 不存在${NC}"
fi

if [ -f "public/sitemap-index.xml" ]; then
    echo -e "${GREEN}✅ public/sitemap-index.xml 存在${NC}"
    echo -e "${BLUE}   文件大小: $(wc -c < public/sitemap-index.xml) 字节${NC}"
else
    echo -e "${RED}❌ public/sitemap-index.xml 不存在${NC}"
fi

# 测试在线访问
echo -e "${YELLOW}🌐 测试在线访问...${NC}"

# 测试robots.txt
echo -e "${BLUE}测试 https://dongboge.cn/robots.txt${NC}"
ROBOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/robots.txt 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  响应码: $ROBOTS_RESPONSE${NC}"

if [ "$ROBOTS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ robots.txt 访问正常${NC}"
    echo -e "${BLUE}  内容预览:${NC}"
    curl -s https://dongboge.cn/robots.txt 2>/dev/null | head -5 | sed 's/^/    /'
else
    echo -e "${RED}❌ robots.txt 访问失败${NC}"
fi

echo ""

# 测试sitemap.xml
echo -e "${BLUE}测试 https://dongboge.cn/sitemap.xml${NC}"
SITEMAP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/sitemap.xml 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  响应码: $SITEMAP_RESPONSE${NC}"

if [ "$SITEMAP_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ sitemap.xml 访问正常${NC}"
    echo -e "${BLUE}  内容预览:${NC}"
    curl -s https://dongboge.cn/sitemap.xml 2>/dev/null | head -10 | sed 's/^/    /'
else
    echo -e "${RED}❌ sitemap.xml 访问失败${NC}"
fi

echo ""

# 测试sitemap-index.xml
echo -e "${BLUE}测试 https://dongboge.cn/sitemap-index.xml${NC}"
SITEMAP_INDEX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/sitemap-index.xml 2>/dev/null || echo "ERROR")
echo -e "${BLUE}  响应码: $SITEMAP_INDEX_RESPONSE${NC}"

if [ "$SITEMAP_INDEX_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ sitemap-index.xml 访问正常${NC}"
    echo -e "${BLUE}  内容预览:${NC}"
    curl -s https://dongboge.cn/sitemap-index.xml 2>/dev/null | head -5 | sed 's/^/    /'
else
    echo -e "${RED}❌ sitemap-index.xml 访问失败${NC}"
fi

echo ""

# 统计结果
SUCCESS_COUNT=0
TOTAL_COUNT=3

if [ "$ROBOTS_RESPONSE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
fi

if [ "$SITEMAP_RESPONSE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
fi

if [ "$SITEMAP_INDEX_RESPONSE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
fi

echo -e "${BLUE}📊 诊断结果总结:${NC}"
echo -e "${BLUE}  成功访问: $SUCCESS_COUNT/$TOTAL_COUNT${NC}"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "${GREEN}🎉 所有SEO文件都可以正常访问！${NC}"
    echo -e "${BLUE}✅ 你的网站SEO配置正常，可以提交sitemap到搜索引擎了${NC}"
elif [ $SUCCESS_COUNT -eq 0 ]; then
    echo -e "${RED}❌ 所有SEO文件都无法访问${NC}"
    echo -e "${YELLOW}🔧 建议运行修复脚本: ./deploy/fix-seo-files-access.sh${NC}"
else
    echo -e "${YELLOW}⚠️ 部分SEO文件无法访问${NC}"
    echo -e "${YELLOW}🔧 建议运行修复脚本: ./deploy/fix-seo-files-access.sh${NC}"
fi

echo -e "${BLUE}🔍 诊断完成！${NC}"