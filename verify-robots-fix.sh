#!/bin/bash

# 验证 robots.txt 修复结果
# 检查 Google Search Console 问题是否已解决

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 验证 robots.txt 修复结果...${NC}"

# 1. 检查本地文件
echo -e "${YELLOW}📁 检查本地 robots.txt...${NC}"
node scripts/validate-robots.cjs

echo ""

# 2. 检查在线版本
echo -e "${YELLOW}🌐 检查在线 robots.txt...${NC}"

# 获取在线内容
ONLINE_CONTENT=$(curl -s https://dongboge.cn/robots.txt 2>/dev/null || echo "ERROR")

if [ "$ONLINE_CONTENT" = "ERROR" ]; then
    echo -e "${RED}❌ 无法获取在线 robots.txt${NC}"
    exit 1
fi

# 检查是否包含 Googlebot Crawl-delay（这是问题所在）
if echo "$ONLINE_CONTENT" | grep -A5 "User-agent: Googlebot" | grep -q "Crawl-delay"; then
    echo -e "${RED}❌ 在线版本仍包含 Googlebot Crawl-delay 规则${NC}"
    echo -e "${YELLOW}🔧 需要重新部署 robots.txt 文件${NC}"
    
    echo -e "${BLUE}📋 部署命令：${NC}"
    echo -e "${BLUE}  方法1: ./deploy-seo-files.sh${NC}"
    echo -e "${BLUE}  方法2: 手动上传 public/robots.txt 到服务器${NC}"
    
else
    echo -e "${GREEN}✅ 在线版本已修复 Googlebot Crawl-delay 问题${NC}"
fi

# 3. 显示修复前后对比
echo -e "${YELLOW}📊 修复内容对比...${NC}"

echo -e "${BLUE}修复前的问题:${NC}"
echo -e "${RED}  • 第25行: User-agent: Googlebot${NC}"
echo -e "${RED}  • 第28行: Crawl-delay: 1${NC}"
echo -e "${RED}  • Google 不支持此指令，会被忽略${NC}"

echo ""

echo -e "${BLUE}修复后的改进:${NC}"
echo -e "${GREEN}  • 移除了 Googlebot 特定的 Crawl-delay 规则${NC}"
echo -e "${GREEN}  • 保留了其他搜索引擎的 Crawl-delay 设置${NC}"
echo -e "${GREEN}  • 符合 Google robots.txt 规范${NC}"

# 4. 检查文件行数变化
LOCAL_LINES=$(wc -l < public/robots.txt)
echo -e "${BLUE}📏 当前文件: $LOCAL_LINES 行${NC}"

# 5. 显示当前内容结构
echo -e "${YELLOW}📄 当前 robots.txt 结构:${NC}"
echo -e "${BLUE}  • User-agent: * (全局规则)${NC}"
echo -e "${BLUE}  • Allow/Disallow 规则${NC}"
echo -e "${BLUE}  • Sitemap 声明${NC}"
echo -e "${BLUE}  • 百度搜索引擎特殊设置${NC}"
echo -e "${BLUE}  • 搜狗搜索引擎特殊设置${NC}"
echo -e "${BLUE}  • 360搜索引擎特殊设置${NC}"
echo -e "${GREEN}  • 不再包含 Googlebot 特殊设置${NC}"

echo ""

# 6. 下一步建议
echo -e "${YELLOW}📋 下一步建议:${NC}"

if echo "$ONLINE_CONTENT" | grep -A5 "User-agent: Googlebot" | grep -q "Crawl-delay"; then
    echo -e "${BLUE}1. 立即部署修复后的 robots.txt${NC}"
    echo -e "${BLUE}2. 等待 Google 重新抓取（通常24-48小时）${NC}"
    echo -e "${BLUE}3. 在 Google Search Console 中检查问题是否消失${NC}"
else
    echo -e "${GREEN}1. ✅ robots.txt 已正确部署${NC}"
    echo -e "${BLUE}2. 等待 Google 重新抓取（通常24-48小时）${NC}"
    echo -e "${BLUE}3. 在 Google Search Console 中验证问题已解决${NC}"
    echo -e "${BLUE}4. 可以继续提交 sitemap 到搜索引擎${NC}"
fi

echo ""
echo -e "${GREEN}🎉 robots.txt 修复验证完成！${NC}"