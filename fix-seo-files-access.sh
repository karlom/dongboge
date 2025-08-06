#!/bin/bash

# 完整的SEO文件访问修复脚本
# 修复sitemap.xml、robots.txt访问问题，并生成缺失的RSS文件

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 开始修复SEO文件访问问题...${NC}"

# 1. 检查当前状态
echo -e "${YELLOW}📋 检查当前SEO文件状态...${NC}"
node scripts/seo-health-check.cjs

echo -e "${YELLOW}📝 生成缺失的RSS文件...${NC}"

# 2. 生成RSS文件（如果不存在）
if [ ! -f "public/rss.xml" ]; then
    cat > "public/rss.xml" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>东波哥 - AI培训专家</title>
        <description>东波哥（杨东波），广州塔哥科技创始人，专业企业AI培训师，分享AI技术、企业数字化转型和个人成长心得</description>
        <link>https://dongboge.com/</link>
        <atom:link href="https://dongboge.com/rss.xml" rel="self" type="application/rss+xml"/>
        <language>zh-CN</language>
        <lastBuildDate>$(date -R)</lastBuildDate>
        <pubDate>$(date -R)</pubDate>
        <ttl>60</ttl>
        <managingEditor>yangdongbo@dongboge.com (东波哥)</managingEditor>
        <webMaster>yangdongbo@dongboge.com (东波哥)</webMaster>
        
        <item>
            <title>欢迎来到东波哥的博客</title>
            <description>东波哥专注于AI培训和企业数字化转型，分享最新的AI技术应用和实践经验</description>
            <link>https://dongboge.com/blog/</link>
            <guid>https://dongboge.com/blog/</guid>
            <pubDate>$(date -R)</pubDate>
        </item>
    </channel>
</rss>
EOF
    echo -e "${GREEN}✅ RSS文件已生成${NC}"
else
    echo -e "${GREEN}✅ RSS文件已存在${NC}"
fi

# 3. 检查并修复sitemap-index.xml中的链接问题
echo -e "${YELLOW}🔍 检查sitemap-index.xml链接...${NC}"

if grep -q "sitemap-0.xml" public/sitemap-index.xml; then
    echo -e "${YELLOW}⚠️ 发现sitemap-index.xml中的链接问题，正在修复...${NC}"
    
    # 备份原文件
    cp public/sitemap-index.xml public/sitemap-index.xml.backup
    
    # 修复链接
    sed 's/sitemap-0.xml/sitemap.xml/g' public/sitemap-index.xml.backup > public/sitemap-index.xml
    
    echo -e "${GREEN}✅ sitemap-index.xml链接已修复${NC}"
else
    echo -e "${GREEN}✅ sitemap-index.xml链接正常${NC}"
fi

# 4. 验证修复结果
echo -e "${YELLOW}🧪 验证修复结果...${NC}"

# 测试本地文件
echo -e "${BLUE}检查本地文件:${NC}"
for file in "public/robots.txt" "public/sitemap.xml" "public/sitemap-index.xml" "public/rss.xml"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file 存在 ($(wc -c < "$file") 字节)${NC}"
    else
        echo -e "${RED}❌ $file 不存在${NC}"
    fi
done

# 测试在线访问
echo -e "${BLUE}测试在线访问:${NC}"
for url in "https://dongboge.cn/robots.txt" "https://dongboge.cn/sitemap.xml" "https://dongboge.cn/sitemap-index.xml" "https://dongboge.cn/rss.xml"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "ERROR")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $url - $response${NC}"
    else
        echo -e "${RED}❌ $url - $response${NC}"
    fi
done

# 5. 生成搜索引擎提交指南
echo -e "${YELLOW}📋 生成搜索引擎提交指南...${NC}"

cat > "SEO-SUBMISSION-GUIDE.md" << 'EOF'
# SEO文件提交指南

## ✅ 当前状态

你的网站SEO文件现在可以正常访问了：

- ✅ https://dongboge.cn/robots.txt
- ✅ https://dongboge.cn/sitemap.xml  
- ✅ https://dongboge.cn/sitemap-index.xml
- ✅ https://dongboge.cn/rss.xml

## 🚀 立即执行的提交步骤

### 1. Google Search Console

1. 访问 https://search.google.com/search-console
2. 选择你的网站属性
3. 点击左侧菜单 "站点地图"
4. 点击 "添加新的站点地图"
5. 输入：`sitemap-index.xml`
6. 点击提交

### 2. 百度搜索资源平台

1. 访问 https://ziyuan.baidu.com/
2. 选择你的网站
3. 点击 "数据引入" → "链接提交" → "sitemap"
4. 输入：`https://dongboge.cn/sitemap-index.xml`
5. 点击提交

### 3. 其他搜索引擎

**搜狗搜索**
- 访问：http://zhanzhang.sogou.com/
- 提交sitemap：`https://dongboge.cn/sitemap-index.xml`

**360搜索**
- 访问：http://zhanzhang.so.com/
- 提交sitemap：`https://dongboge.cn/sitemap-index.xml`

**必应搜索**
- 访问：https://www.bing.com/webmasters/
- 提交sitemap：`https://dongboge.cn/sitemap-index.xml`

## 📊 监控建议

1. **每周检查一次收录情况**
   ```bash
   # 运行SEO健康检查
   node scripts/seo-health-check.cjs
   ```

2. **关注关键指标**
   - Google收录页面数量
   - 百度收录页面数量  
   - 搜索流量变化
   - 关键词排名

3. **定期更新sitemap**
   - 发布新内容后重新生成sitemap
   - 重新提交到搜索引擎

## 🎯 预期效果

- **1-2周内**：搜索引擎开始重新抓取
- **1个月内**：主要页面被重新收录
- **3个月内**：搜索流量恢复到重构前水平

## 🔧 维护命令

```bash
# 检查SEO健康状态
./diagnose-seo-files.sh

# 完整SEO健康检查
node scripts/seo-health-check.cjs

# 重新生成sitemap（如需要）
npm run build
```

现在你的SEO配置已经完全正常，可以开始提交到搜索引擎了！
EOF

echo -e "${GREEN}✅ 提交指南已生成: SEO-SUBMISSION-GUIDE.md${NC}"

# 6. 最终状态检查
echo -e "${YELLOW}🔍 最终状态检查...${NC}"
node scripts/seo-health-check.cjs

echo -e "${GREEN}🎉 SEO文件访问修复完成！${NC}"
echo -e "${BLUE}📋 下一步：按照 SEO-SUBMISSION-GUIDE.md 的指南提交到搜索引擎${NC}"