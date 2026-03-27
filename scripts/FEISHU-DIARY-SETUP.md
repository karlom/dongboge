# 飞书日记 → AI 博客文章 配置指南

## 功能概述

通过飞书开放平台 API 读取多维表格中的日记原始记录，使用 AI（Claude/OpenAI）转写成博客文章，自动生成 Markdown 文件并提交到代码库。

## 第一步：创建飞书自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app) → 点击「创建企业自建应用」
2. 填写应用名称（如：`个人博客日记同步`）和描述
3. 创建完成后，在「凭证与基础信息」页面获取：
   - `App ID`
   - `App Secret`

## 第二步：配置应用权限

在应用管理页面 → 「权限管理」→ 搜索并开通以下权限：

- `bitable:app:readonly` — 读取多维表格（应用商店 → 查看多维表格）
- 或 `bitable:app` — 读写多维表格（如果需要标记"已发布"状态）

保存后点击「申请线上版本」发布。

## 第三步：获取多维表格信息

### app_token
从多维表格 URL 提取：
```
https://pcnac7b06972.feishu.cn/base/RG2abEiE1ad0l7sdifNcK4O9n4c
                                       ↑ 这就是 app_token
```
本项目的 app_token = `RG2abEiE1ad0l7sdifNcK4O9n4c`（已内置到脚本中）

### table_id
运行脚本时如果没有配置 `FEISHU_TABLE_ID`，脚本会自动列出所有数据表供选择：
```bash
node scripts/feishu-diary-to-blog.js --list
```
输出示例：
```
可用数据表：
  1. [tblXXXXXXXX] 日记记录
  2. [tblYYYYYYYY] 草稿
```
将 `tblXXXXXXXX` 填入 `.env`。

## 第四步：将应用添加到多维表格

1. 打开多维表格
2. 右上角「...」→「高级权限」→「添加成员」
3. 搜索你的应用名称，赋予「可阅读」权限

## 第五步：配置环境变量

在项目根目录 `.env` 文件中添加：

```env
# 飞书应用配置
FEISHU_APP_ID=cli_xxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_APP_TOKEN=RG2abEiE1ad0l7sdifNcK4O9n4c
FEISHU_TABLE_ID=tblxxxxxxxxxx

# AI API（二选一，优先使用 Claude）
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
# OPENAI_API_KEY=sk-xxxxxxxx
```

## 第六步：运行脚本

```bash
# 列出所有记录（验证连接是否正常）
node scripts/feishu-diary-to-blog.js --list

# 生成最新一条记录的博客文章（并自动 git commit）
node scripts/feishu-diary-to-blog.js

# 生成指定日期的记录
node scripts/feishu-diary-to-blog.js --date 2026-03-27

# 生成指定 record_id 的记录
node scripts/feishu-diary-to-blog.js --record-id recXXXXXX

# 只生成文件，不提交 git
node scripts/feishu-diary-to-blog.js --no-commit
```

## 添加到 package.json 脚本（可选）

```json
"scripts": {
  "diary": "node scripts/feishu-diary-to-blog.js",
  "diary:list": "node scripts/feishu-diary-to-blog.js --list",
  "diary:no-commit": "node scripts/feishu-diary-to-blog.js --no-commit"
}
```

## 飞书多维表格字段建议

建议在多维表格中创建以下字段，脚本会自动读取所有字段：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 日期 | 日期 | 日记日期 |
| 今天做了什么 | 多行文本 | 主要事件记录 |
| 心情/感受 | 多行文本 | 情绪和感受 |
| 收获/思考 | 多行文本 | 总结和反思 |
| 明日计划 | 多行文本 | 次日计划 |
| 已发布 | 勾选 | 标记是否已生成博客（脚本不会跳过，手动管理） |

字段名称和数量可以完全自定义，脚本会把所有有内容的字段都提取出来传给 AI。

## 故障排查

### "获取飞书 Token 失败"
- 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确
- 确认应用已发布（点击「申请线上版本」）

### "获取记录失败：权限不足"
- 确认已将应用添加到多维表格的成员中
- 确认应用拥有 `bitable:app:readonly` 权限

### "获取数据表列表失败"
- 检查 `FEISHU_APP_TOKEN` 是否正确（从 URL 提取）
- 确认多维表格是你自己的或有访问权限

### Claude API 错误
- 确认 `ANTHROPIC_API_KEY` 有效
- 检查 API 余额
