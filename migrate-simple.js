#!/usr/bin/env node

// 简化版迁移脚本 - 如果 REST API 不可用时使用
import fs from 'fs';
import path from 'path';

const WORDPRESS_URL = 'https://www.dongboge.cn';
const OUTPUT_DIR = './src/content/blog';

// 手动创建示例文章（基于你的博客内容）
const samplePosts = [
  {
    title: "AI时代的企业数字化转型实践指南",
    description: "探讨人工智能如何重塑现代企业的运营模式，分享数字化转型的实践经验和成功案例。",
    pubDate: "Dec 15 2024",
    tags: ["人工智能", "数字化转型", "企业管理", "AI应用"],
    content: `# AI时代的企业数字化转型实践指南

在当今快速发展的数字化时代，人工智能已经不再是科幻小说中的概念，而是实实在在地改变着我们的工作和生活方式。

## 数字化转型的核心要素

### 1. 技术基础设施
- 云计算平台的选择与部署
- 数据管理体系的建立
- AI模型的集成与优化

### 2. 组织变革
- 团队结构的调整
- 工作流程的重新设计
- 人才培养与技能提升

### 3. 业务创新
- 新商业模式的探索
- 客户体验的优化
- 产品服务的智能化

## 实施策略

数字化转型不是一蹴而就的过程，需要循序渐进：

1. **评估现状**：全面分析企业当前的技术水平和业务需求
2. **制定规划**：设定明确的转型目标和时间节点
3. **试点实施**：选择关键业务场景进行小规模试验
4. **全面推广**：基于试点经验进行规模化部署
5. **持续优化**：建立反馈机制，不断改进和完善

## 成功案例分享

在我的咨询实践中，帮助多家企业成功实现了数字化转型，其中包括：

- 制造业企业通过AI质检系统提升产品质量
- 零售企业利用智能推荐系统增加销售额
- 服务业企业部署智能客服降低运营成本

## 总结

AI时代的数字化转型是企业发展的必然趋势。成功的关键在于找到适合自身的转型路径，循序渐进地推进各项改革措施。

如果您的企业也在考虑数字化转型，欢迎与我交流探讨具体的实施方案。`
  },
  {
    title: "大语言模型在企业应用中的最佳实践",
    description: "深入分析大语言模型在企业级应用中的部署策略、性能优化和安全考虑。",
    pubDate: "Dec 10 2024",
    tags: ["大语言模型", "LLM", "企业应用", "AI部署"],
    content: `# 大语言模型在企业应用中的最佳实践

随着ChatGPT、Claude等大语言模型的快速发展，越来越多的企业开始探索如何将这些强大的AI能力集成到自己的业务流程中。

## 企业级LLM应用场景

### 1. 智能客服系统
- 自动回答常见问题
- 多轮对话管理
- 情感分析与个性化回复

### 2. 内容生成与编辑
- 营销文案创作
- 技术文档生成
- 多语言翻译

### 3. 数据分析与洞察
- 报告自动生成
- 趋势分析解读
- 决策支持建议

## 部署策略选择

### 云端API调用
**优势：**
- 快速部署，无需基础设施投入
- 持续更新，享受最新模型能力
- 按需付费，成本可控

**劣势：**
- 数据安全风险
- 网络依赖性强
- 长期成本可能较高

### 私有化部署
**优势：**
- 数据完全可控
- 可定制化程度高
- 长期成本相对较低

**劣势：**
- 初期投入大
- 技术门槛高
- 维护成本高

## 性能优化技巧

### 1. 提示词工程
- 设计清晰的指令模板
- 提供具体的示例
- 设置合适的输出格式

### 2. 模型微调
- 收集高质量的训练数据
- 选择合适的微调策略
- 定期评估和更新模型

### 3. 缓存机制
- 对常见问题建立缓存
- 实现智能路由分发
- 优化响应时间

## 安全与合规考虑

### 数据安全
- 敏感信息脱敏处理
- 访问权限控制
- 审计日志记录

### 内容安全
- 输出内容过滤
- 有害信息检测
- 合规性审查

## 实施建议

1. **从小场景开始**：选择风险较低的应用场景进行试点
2. **建立评估体系**：制定明确的效果评估指标
3. **持续优化改进**：基于用户反馈不断完善系统
4. **团队能力建设**：培养内部AI应用专业人才

## 未来展望

大语言模型技术仍在快速发展，企业需要保持敏锐的技术嗅觉，及时跟进最新发展趋势，为未来的竞争优势做好准备。

通过合理的规划和实施，大语言模型必将成为企业数字化转型的重要推动力。`
  }
];

function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
    .substring(0, 100);
}

function createMarkdownFile(post) {
  const frontmatter = `---
title: "${post.title}"
description: "${post.description}"
pubDate: "${post.pubDate}"
tags: [${post.tags.map(tag => `"${tag}"`).join(', ')}]
---

${post.content}`;

  return {
    filename: sanitizeFilename(post.title) + '.md',
    content: frontmatter
  };
}

async function createSamplePosts() {
  console.log('🚀 创建示例文章...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 创建目录: ${OUTPUT_DIR}`);
  }
  
  let successCount = 0;
  
  for (const post of samplePosts) {
    try {
      const markdownFile = createMarkdownFile(post);
      const filePath = path.join(OUTPUT_DIR, markdownFile.filename);
      
      if (fs.existsSync(filePath)) {
        console.log(`⚠️  文件已存在，跳过: ${markdownFile.filename}`);
        continue;
      }
      
      fs.writeFileSync(filePath, markdownFile.content, 'utf8');
      console.log(`✅ 已创建: ${markdownFile.filename}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 创建失败: ${post.title}`, error);
    }
  }
  
  console.log(`\n🎉 完成！成功创建 ${successCount} 篇示例文章`);
  console.log('💡 这些是基于你博客风格的示例文章，你可以：');
  console.log('1. 运行 npm run dev 查看效果');
  console.log('2. 编辑这些文章内容');
  console.log('3. 继续尝试 npm run migrate 从 WordPress 获取真实文章');
}

createSamplePosts().catch(console.error);