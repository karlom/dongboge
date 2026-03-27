#!/usr/bin/env node
/**
 * 飞书多维表格 → AI 日记博客文章生成器
 *
 * 功能：
 * 1. 从飞书多维表格读取原始日记记录
 * 2. 用 AI（Claude/OpenAI）转写成博客文章
 * 3. 生成 Markdown 文件到 src/content/blog/
 * 4. 可选：自动 git commit 并 push
 *
 * 使用方式：
 *   node scripts/feishu-diary-to-blog.js
 *   node scripts/feishu-diary-to-blog.js --date 2026-03-27
 *   node scripts/feishu-diary-to-blog.js --record-id recXXXXXX
 *   node scripts/feishu-diary-to-blog.js --list         # 只列出记录，不生成文章
 *   node scripts/feishu-diary-to-blog.js --no-commit    # 生成文件但不提交 git
 *
 * 所需环境变量（在 .env 或系统环境中配置）：
 *   FEISHU_APP_ID        飞书应用 App ID
 *   FEISHU_APP_SECRET    飞书应用 App Secret
 *   FEISHU_APP_TOKEN     多维表格 app_token（从 URL 提取）
 *   FEISHU_TABLE_ID      数据表 table_id（从飞书获取）
 *   ANTHROPIC_API_KEY    Claude API Key（用于 AI 转写）
 *                        或 OPENAI_API_KEY（使用 OpenAI）
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const BLOG_DIR = join(PROJECT_ROOT, 'src/content/blog');

// ─── 解析命令行参数 ────────────────────────────────────────────────
const args = process.argv.slice(2);
const opts = {
  date: args.find((_, i) => args[i - 1] === '--date') || null,
  recordId: args.find((_, i) => args[i - 1] === '--record-id') || null,
  listOnly: args.includes('--list'),
  noCommit: args.includes('--no-commit'),
  help: args.includes('--help') || args.includes('-h'),
};

if (opts.help) {
  console.log(`
飞书多维表格 → AI 博客日记生成器

使用方式:
  node scripts/feishu-diary-to-blog.js                    # 获取最新一条未发布记录并生成文章
  node scripts/feishu-diary-to-blog.js --date 2026-03-27 # 指定日期的记录
  node scripts/feishu-diary-to-blog.js --record-id recXX # 指定记录ID
  node scripts/feishu-diary-to-blog.js --list             # 列出所有记录（不生成文章）
  node scripts/feishu-diary-to-blog.js --no-commit        # 生成但不提交 git

所需环境变量:
  FEISHU_APP_ID        飞书应用 App ID
  FEISHU_APP_SECRET    飞书应用 App Secret
  FEISHU_APP_TOKEN     多维表格 app_token
  FEISHU_TABLE_ID      数据表 table_id
  ANTHROPIC_API_KEY    Claude API Key（推荐）或 OPENAI_API_KEY
  `);
  process.exit(0);
}

// ─── 加载环境变量 ──────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(PROJECT_ROOT, '.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, val] = match;
        if (!process.env[key]) {
          process.env[key] = val.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}
loadEnv();

const CONFIG = {
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    appToken: process.env.FEISHU_APP_TOKEN || 'RG2abEiE1ad0l7sdifNcK4O9n4c',
    tableId: process.env.FEISHU_TABLE_ID,
  },
  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
  },
};

// ─── 飞书 API 封装 ─────────────────────────────────────────────────

/**
 * 获取飞书 tenant_access_token
 */
async function getFeishuToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret,
    }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取飞书 Token 失败: ${data.msg} (code: ${data.code})`);
  }
  console.log('✅ 飞书 Token 获取成功');
  return data.tenant_access_token;
}

/**
 * 列出多维表格下的所有数据表
 */
async function listTables(token) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取数据表列表失败: ${data.msg}`);
  }
  return data.data.items || [];
}

/**
 * 获取数据表字段列表
 */
async function listFields(token, tableId) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${tableId}/fields`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取字段列表失败: ${data.msg}`);
  }
  return data.data.items || [];
}

/**
 * 获取数据表记录列表（支持分页）
 */
async function listRecords(token, tableId, pageToken = null, pageSize = 20) {
  const params = new URLSearchParams({ page_size: pageSize.toString() });
  if (pageToken) params.set('page_token', pageToken);

  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${tableId}/records?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取记录失败: ${data.msg}`);
  }
  return data.data;
}

/**
 * 获取单条记录
 */
async function getRecord(token, tableId, recordId) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${CONFIG.feishu.appToken}/tables/${tableId}/records/${recordId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取记录失败: ${data.msg}`);
  }
  return data.data.record;
}

/**
 * 将记录字段值转为可读文本
 */
function extractFieldValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '是' : '否';

  // 富文本/多行文本（数组格式）
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.text) return item.text;
        if (item?.value) return extractFieldValue(item.value);
        return JSON.stringify(item);
      })
      .join('');
  }

  // 日期时间（时间戳毫秒）
  if (value?.type === 'date' || (typeof value === 'object' && value?.timestamp)) {
    const ts = value.timestamp || value;
    if (typeof ts === 'number') {
      return new Date(ts).toLocaleDateString('zh-CN');
    }
  }

  // 对象
  if (typeof value === 'object') {
    if (value.text) return value.text;
    if (value.value) return extractFieldValue(value.value);
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * 将记录的所有字段整理为结构化文本
 */
function recordToText(record, fields) {
  const lines = [];
  for (const field of fields) {
    const rawValue = record.fields?.[field.field_name];
    if (rawValue === null || rawValue === undefined) continue;
    const text = extractFieldValue(rawValue);
    if (text.trim()) {
      lines.push(`【${field.field_name}】\n${text}`);
    }
  }
  return lines.join('\n\n');
}

// ─── AI 转写 ───────────────────────────────────────────────────────

/**
 * 用 Claude 将原始记录转写成博客文章
 */
async function rewriteWithClaude(rawText, metadata = {}) {
  const systemPrompt = `你是一位擅长写个人博客的AI写作助手。你的任务是将用户的原始日记/记录内容转写成一篇自然、真实、有个性的博客文章。

写作要求：
1. 保留原始内容的核心事实和情感，不要编造内容
2. 语言自然流畅，像一个真实的人在写博客，不要过于正式
3. 保持第一人称叙述
4. 如果原始内容是条列式记录，可以适当扩展每一点，但不要过分铺陈
5. 文章长度：300-800字为宜，根据原始内容的丰富程度决定
6. 输出格式：只输出文章正文，不要包含标题（标题会单独处理）
7. 不要加"综上所述"、"总结"等套话结尾
8. 语言：中文`;

  const userPrompt = `请将以下原始日记记录转写成一篇博客文章正文：

${rawText}

${metadata.date ? `日期：${metadata.date}` : ''}

请直接输出文章正文，不需要标题。`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.ai.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await res.json();
  if (data.type === 'error') {
    throw new Error(`Claude API 错误: ${data.error?.message}`);
  }
  return data.content?.[0]?.text || '';
}

/**
 * 用 Claude 生成文章标题、description 和 tags
 */
async function generateMetaWithClaude(articleText, rawText, date) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.ai.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `根据以下博客文章，生成文章元信息。严格按 JSON 格式返回，不要有其他内容。

文章内容：
${articleText}

日期：${date}

请返回如下 JSON（不要 markdown 代码块）：
{
  "title": "文章标题（20字以内，不含日期）",
  "description": "文章摘要（50-80字，吸引读者的一句话）",
  "tags": ["标签1", "标签2", "标签3"],
  "slug": "英文-url-slug-用连字符"
}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';

  try {
    // 提取 JSON（处理可能的多余文字）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] || '{}');
  } catch {
    console.warn('⚠️  元信息解析失败，使用默认值');
    return {
      title: `${date} 日记`,
      description: articleText.slice(0, 80) + '...',
      tags: ['日记'],
      slug: `diary-${date}`,
    };
  }
}

/**
 * 用 OpenAI 转写（备用方案）
 */
async function rewriteWithOpenAI(rawText, metadata = {}) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.ai.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位擅长写个人博客的AI写作助手。将用户的原始日记记录转写成自然、真实的博客文章正文。保留核心事实，语言自然，第一人称，中文，300-800字，不加标题。',
        },
        {
          role: 'user',
          content: `请将以下原始日记记录转写成博客文章正文：\n\n${rawText}\n\n${metadata.date ? `日期：${metadata.date}` : ''}`,
        },
      ],
      max_tokens: 2000,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Markdown 文件生成 ─────────────────────────────────────────────

/**
 * 生成博客文章 Markdown 文件
 */
function generateMarkdownFile(meta, content, date) {
  const pubDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const frontmatter = [
    '---',
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `description: "${meta.description.replace(/"/g, '\\"')}"`,
    `pubDate: "${pubDate}"`,
    `tags: [${meta.tags.map((t) => `"${t}"`).join(', ')}]`,
    `heroImage: "../../assets/default.jpg"`,
    `slug: "${meta.slug}"`,
    '---',
    '',
  ].join('\n');

  return frontmatter + content;
}

/**
 * 生成安全的文件名
 */
function generateFilename(date, title) {
  // 格式：2026年3月27日日记.md
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const safetitle = title.replace(/[/\\:*?"<>|]/g, '').slice(0, 20);
  return `${year}年${month}月${day}日${safetitle}.md`;
}

// ─── Git 操作 ──────────────────────────────────────────────────────

function gitCommitAndPush(filePath, title) {
  try {
    execSync(`git -C "${PROJECT_ROOT}" add "${filePath}"`, { stdio: 'pipe' });
    execSync(`git -C "${PROJECT_ROOT}" commit -m "feat: AI日记 - ${title}"`, { stdio: 'pipe' });
    console.log('✅ Git commit 成功');

    try {
      execSync(`git -C "${PROJECT_ROOT}" push`, { stdio: 'pipe' });
      console.log('✅ Git push 成功');
    } catch {
      console.log('⚠️  Git push 失败（可能需要手动 push）');
    }
  } catch (err) {
    console.error('❌ Git commit 失败:', err.message);
  }
}

// ─── 主流程 ────────────────────────────────────────────────────────

async function main() {
  // 检查必需配置
  if (!CONFIG.feishu.appId || !CONFIG.feishu.appSecret) {
    console.error(`
❌ 缺少飞书应用配置！

请在项目根目录的 .env 文件中添加：
  FEISHU_APP_ID=your_app_id
  FEISHU_APP_SECRET=your_app_secret
  FEISHU_TABLE_ID=your_table_id    # 可选，不填则自动列出所有表让你选择

详细配置说明请查看：scripts/FEISHU-DIARY-SETUP.md
    `);
    process.exit(1);
  }

  if (!opts.listOnly && !CONFIG.ai.anthropicKey && !CONFIG.ai.openaiKey) {
    console.error(`
❌ 缺少 AI API Key！

请在 .env 中添加：
  ANTHROPIC_API_KEY=your_claude_key
  或
  OPENAI_API_KEY=your_openai_key
    `);
    process.exit(1);
  }

  console.log('🚀 飞书日记博客生成器启动...\n');

  // 1. 获取飞书 Token
  const token = await getFeishuToken();

  // 2. 如果没有配置 tableId，列出所有数据表让用户选择
  let tableId = CONFIG.feishu.tableId;
  if (!tableId) {
    console.log('📋 获取多维表格数据表列表...');
    const tables = await listTables(token);
    if (tables.length === 0) {
      console.error('❌ 该多维表格下没有数据表');
      process.exit(1);
    }
    console.log('\n可用数据表：');
    tables.forEach((t, i) => {
      console.log(`  ${i + 1}. [${t.table_id}] ${t.name}`);
    });

    if (tables.length === 1) {
      tableId = tables[0].table_id;
      console.log(`\n✅ 自动选择唯一数据表：${tables[0].name} (${tableId})`);
    } else {
      console.log('\n请在 .env 中设置 FEISHU_TABLE_ID=<table_id> 来指定数据表');
      process.exit(0);
    }
  }

  // 3. 获取字段结构
  console.log('\n📊 获取字段结构...');
  const fields = await listFields(token, tableId);
  console.log(`字段列表: ${fields.map((f) => f.field_name).join(', ')}`);

  // 4. 只列出模式
  if (opts.listOnly) {
    console.log('\n📝 获取记录列表...');
    const result = await listRecords(token, tableId, null, 20);
    const records = result.items || [];
    console.log(`\n共 ${result.total} 条记录，显示最近 ${records.length} 条：\n`);

    records.forEach((rec, i) => {
      const firstField = fields[0];
      const firstVal = firstField ? extractFieldValue(rec.fields?.[firstField.field_name]) : '';
      console.log(`  ${i + 1}. [${rec.record_id}] ${firstVal.slice(0, 60)}...`);
    });
    return;
  }

  // 5. 获取目标记录
  let record;
  if (opts.recordId) {
    console.log(`\n🔍 获取指定记录 ${opts.recordId}...`);
    record = await getRecord(token, tableId, opts.recordId);
  } else {
    console.log('\n📥 获取最新记录...');
    const result = await listRecords(token, tableId, null, 50);
    const records = result.items || [];

    if (records.length === 0) {
      console.log('❌ 数据表中没有记录');
      process.exit(0);
    }

    // 如果指定了日期，按日期筛选
    if (opts.date) {
      // 尝试从字段中匹配日期
      const targetDate = new Date(opts.date).toLocaleDateString('zh-CN');
      record = records.find((r) => {
        return fields.some((f) => {
          const val = extractFieldValue(r.fields?.[f.field_name]);
          return val.includes(opts.date) || val.includes(targetDate);
        });
      });
      if (!record) {
        console.log(`❌ 没有找到 ${opts.date} 的记录`);
        process.exit(0);
      }
    } else {
      // 取最新一条记录
      record = records[records.length - 1];
    }
  }

  console.log(`\n✅ 已获取记录 [${record.record_id}]`);

  // 6. 提取原始文本
  const rawText = recordToText(record, fields);
  console.log('\n📄 原始记录内容：');
  console.log('─'.repeat(50));
  console.log(rawText.slice(0, 500) + (rawText.length > 500 ? '...' : ''));
  console.log('─'.repeat(50));

  // 7. 确定日期
  const today = new Date().toISOString().split('T')[0];
  const articleDate = opts.date || today;

  // 8. AI 转写
  console.log('\n🤖 正在用 AI 转写文章...');
  let articleContent;
  if (CONFIG.ai.anthropicKey) {
    articleContent = await rewriteWithClaude(rawText, { date: articleDate });
  } else {
    articleContent = await rewriteWithOpenAI(rawText, { date: articleDate });
  }
  console.log('✅ 文章转写完成');

  // 9. 生成元信息
  console.log('\n🏷️  生成文章元信息...');
  let meta;
  if (CONFIG.ai.anthropicKey) {
    meta = await generateMetaWithClaude(articleContent, rawText, articleDate);
  } else {
    meta = {
      title: `${articleDate} 日记`,
      description: articleContent.slice(0, 80) + '...',
      tags: ['日记'],
      slug: `diary-${articleDate}`,
    };
  }
  console.log(`标题：${meta.title}`);
  console.log(`Slug：${meta.slug}`);
  console.log(`标签：${meta.tags.join(', ')}`);

  // 10. 生成 Markdown 文件
  const markdownContent = generateMarkdownFile(meta, articleContent, articleDate);
  const filename = generateFilename(articleDate, meta.title);
  const filePath = join(BLOG_DIR, filename);

  // 检查是否已存在同名文件
  if (existsSync(filePath)) {
    console.log(`\n⚠️  文件已存在：${filename}`);
    console.log('如需覆盖，请手动删除后重新运行');
    process.exit(0);
  }

  writeFileSync(filePath, markdownContent, 'utf-8');
  console.log(`\n✅ 博客文章已生成：src/content/blog/${filename}`);

  // 11. 显示文章预览
  console.log('\n📖 文章预览：');
  console.log('─'.repeat(50));
  console.log(markdownContent.slice(0, 600) + '...');
  console.log('─'.repeat(50));

  // 12. Git 提交
  if (!opts.noCommit) {
    console.log('\n📤 提交到 Git...');
    gitCommitAndPush(filePath, meta.title);
  } else {
    console.log('\n💡 已跳过 Git 提交（--no-commit 模式）');
    console.log(`   文件路径：${filePath}`);
  }

  console.log('\n🎉 完成！');
}

main().catch((err) => {
  console.error('\n❌ 发生错误：', err.message);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
