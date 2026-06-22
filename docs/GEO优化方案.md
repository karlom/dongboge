# dongboge.cn GEO 优化方案

> 版本：v1.0
> 日期：2026-06-21
> 适用项目：`/Users/ydb/code/astroBlog/dongboge`
> 目标站点：<https://dongboge.cn>

## 1. 方案结论

本项目的 GEO 优化不应从“多加几个 AI 爬虫名称”开始，而应先解决四个基础问题：**页面能稳定被检索、机器能准确理解实体与内容、核心观点有事实支撑、AI 推荐结果可持续监测**。

当前网站已经具备 Astro SSR、博客内容库、robots.txt、sitemap、RSS、Canonical、Person/Service Schema 等基础设施，适合继续做 GEO。但现有实现存在 URL 口径不统一、文章 Schema 缺失、品牌实体信息分散、内容结构偏日记化、部分 SEO 做法风险较高等问题。

建议按以下优先级执行：

1. **P0：修复抓取、URL、语言和 Schema 基线**，先确保 AI 与搜索引擎拿到的是准确页面。
2. **P1：建立“东波哥 / 杨东波 / 广州塔哥科技有限公司”实体中心和高意图内容集群**，让机器知道网站是谁、擅长什么、为什么可信。
3. **P2：建立第三方信源与 AI 推荐监测**，验证是否真正进入回答，而不是只看网站访问量。

预期首轮实施周期为 **4 周**。技术基线 3～5 个工作日可完成，内容与信源建设需要持续 1～3 个月观察。

## 2. 本次方案依据

本方案将参考文章中的三层漏斗落到项目执行：

| GEO 条件 | 对应动作 | 本项目重点 |
| --- | --- | --- |
| 能看见（可检索） | robots、sitemap、稳定 URL、内部链接、页面性能 | 统一 slug；放行搜索型 AI 爬虫；修复 sitemap 生成链路 |
| 读得懂（可理解） | 清晰标题、答案前置、Schema、实体关系 | Article、ProfilePage、Organization、Service、BreadcrumbList |
| 信得过（可信度） | 作者、日期、案例、数据来源、第三方佐证 | 建立事实库；公开可验证案例；补全作者页和组织页 |
| 能验证（可监测） | 提问测试、引用来源、排名与转化记录 | 建立固定问题集和周度 GEO 监测表 |

需要对参考文章做两点校准：

- Google 明确表示 AI Overviews / AI Mode 没有额外的特殊优化要求，传统 SEO 基础仍然有效。因此 GEO 应是 SEO、内容质量和实体可信度的延伸，而不是一套独立的“捷径”。
- `llms.txt` 目前是社区提案，不是各大 AI 平台共同承诺支持的正式抓取标准。可以低成本上线，但优先级应低于 robots、sitemap、正文可读性、Schema 和高质量内容。

## 3. 当前项目审计结果

### 3.1 已有基础

- `astro.config.mjs` 已配置站点 URL、SSR Node adapter 和 sitemap 集成。
- `public/robots.txt` 允许全站公开内容抓取，并屏蔽 `/admin/`、`/api/` 等非公开区域。
- 已有 `sitemap.xml`、`sitemap-index.xml` 和 RSS。
- `src/layouts/Layout.astro` 已包含 Person、Service、Canonical、Open Graph 等信息。
- 博客 frontmatter 已支持 `title`、`description`、`pubDate`、`updatedDate`、`heroImage`、`tags` 和 `slug`。
- 站点已有关于页、服务页、培训案例页和大量博客内容，可作为实体与专业内容建设基础。

### 3.2 主要问题

#### P0：URL 与索引口径不一致

- 博客路由使用 `frontmatter.slug || post.id`，但博客列表页、首页和部分导航仍使用 `post.id`。
- `scripts/generate-complete-sitemap.js` 直接使用文件名生成 URL，没有读取 frontmatter 的 `slug`。
- 至少有一篇内容缺少显式 slug，而内容 schema 当前把 slug 定义为可选。

这会造成内部链接、实际路由和 sitemap 指向不同 URL，削弱 Canonical、抓取和引用信号。

#### P0：文章页机器语义不足

- 博客详情页没有 `BlogPosting` / `Article` JSON-LD。
- 缺少稳定的 `author`、`dateModified`、`mainEntityOfPage`、`publisher`、`keywords` 和文章级 canonical 数据绑定。
- 页面可见区域没有明确作者介绍和作者页链接。
- 面包屑主要是视觉实现，未统一提供 `BreadcrumbList`。
- 博客详情页和博客列表页的 `<html lang>` 仍为 `en`，与中文正文不一致。

#### P0：全站 Schema 口径分散

- Layout、关于页、培训案例页分别维护 Person / Service 数据，字段与主体口径可能漂移。
- Person、Organization 与服务之间缺少稳定 `@id` 连接。
- Organization 结构化数据更适合集中在首页或组织介绍页，不需要在每个页面机械重复。
- Schema 中的任职、履历、成员关系、服务范围和量化数据必须与页面可见内容一致并可验证。

#### P1：内容结构不利于引用

- 现有内容以个人日记和经验记录为主，高购买意图问题的系统答案不足。
- 文章普遍没有“40～80 字直接答案”、关键结论列表、适用对象、方法步骤、数据来源和更新时间。
- 标签为可选，主题聚类、专题页和上下游内链不足。
- 图片 alt 多为标题复用，尚未系统描述人物、场景、课程主题和图中信息。

#### P1：存在不建议延续的旧 SEO 做法

- 首页有 `sr-only` 的关键词型服务文案。隐藏文本即使对无障碍技术可见，也不应专门为了搜索排名重复关键词；核心信息应在页面中真实可见。
- `meta keywords`、关键词密度和重复地域词不应作为 GEO 主策略。
- 不应写无法验证的“最佳、第一、准确率、好评率、服务数量”等数据。

#### P2：AI 搜索专项能力尚未建立

- 线上 `/llms.txt` 当前返回 404。
- robots.txt 未对 `OAI-SearchBot` 等搜索型 AI 爬虫表达显式策略；虽然通配规则已允许抓取，但显式声明更方便审计和维护。
- 尚无固定问题集、AI 引用记录、品牌提及率和引用页面统计。

## 4. 优化目标与指标

### 4.1 90 天目标

1. 核心公开页面均可抓取、Canonical 唯一、sitemap 与站内链接一致。
2. 搜索引擎和 AI 能准确回答“东波哥是谁”“广州塔哥科技做什么”“提供哪些企业 AI 培训服务”。
3. 围绕企业 AI 培训、AI 办公提效、AI 智能体落地形成至少 3 个内容集群。
4. 在不带品牌名的高意图问题中，获得可记录的品牌提及或页面引用。

### 4.2 核心指标

| 指标 | 定义 | 首期目标 |
| --- | --- | --- |
| 技术合格率 | 核心 URL 返回 200、可索引、Canonical 正确、Schema 无严重错误 | 100% |
| 品牌事实准确率 | AI 对品牌、人物、公司和服务的回答中，正确事实数 / 总事实数 | ≥ 95% |
| AI 品牌提及率 | 不带品牌问题中出现“东波哥/杨东波/塔哥科技”的回答数 / 总测试数 | 建立基线后逐月提升 |
| AI 引用率 | 回答引用 dongboge.cn 页面的问题数 / 总测试数 | 建立基线后逐月提升 |
| 引用页面覆盖 | 90 天内至少被一个目标 AI 引用的站内页面数 | ≥ 5 个 |
| 内容更新率 | 重点内容按计划复核并更新 | ≥ 90% |
| 业务转化 | 来源标记为 AI 搜索的有效咨询数 | 单独记录，不承诺固定值 |

## 5. 分阶段实施方案

### Phase 1：技术与实体基线（第 1 周，P0）

#### 5.1 统一 URL 生成逻辑

新增统一工具，例如 `getPostSlug(post)` 和 `getPostUrl(post)`，所有位置只通过该工具生成博客 URL：

- `src/pages/blog/[...slug].astro`
- `src/pages/blog/index.astro`
- `src/pages/index.astro`
- `src/components/BlogNavigation.astro`
- RSS 和 sitemap 生成逻辑

同时执行：

- 将内容 schema 中的 `slug` 改为必填。
- 为缺少 slug 的文章补齐唯一英文 slug。
- sitemap 只保留一套权威生成流程，删除或停用使用文件名的旧逻辑。
- 检查历史错误 URL；有外部流量的旧 URL 配置 301，没有价值的错误 URL 返回 404/410。

#### 5.2 重构全站结构化数据

建立集中式 Schema 生成模块，使用稳定 ID：

- `https://dongboge.cn/#person`：杨东波 / 东波哥。
- `https://dongboge.cn/#organization`：广州塔哥科技有限公司。
- `https://dongboge.cn/#website`：网站主体。
- 服务页：`Service`，通过 `provider` 关联 Person 或 Organization。
- 关于页：`ProfilePage`，`mainEntity` 指向 Person。
- 博客页：`BlogPosting`，包含 `headline`、`description`、`datePublished`、`dateModified`、`author`、`image`、`mainEntityOfPage`。
- 文章与服务页：`BreadcrumbList`。

所有结构化数据必须满足两条规则：**页面可见、事实可验证**。上线前使用 Schema Markup Validator 与 Google Rich Results Test 验证。

#### 5.3 修复页面语义

- 将中文页面统一为 `<html lang="zh-CN">`。
- BaseHead 支持页面类型、作者、发布时间、更新时间、图片 alt 等参数。
- 博客文章增加可见作者卡：姓名、专业领域、关于页链接、最后更新时间。
- 每页只有一个清晰 H1；H2/H3 形成连续层级。
- 为服务页和案例页补充可见的事实说明、适用对象、交付内容和证据来源。

#### 5.4 明确 AI 爬虫策略

在 robots.txt 中将“搜索引用”和“模型训练”分开决策：

```txt
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /
```

其中 OAI-SearchBot 用于 ChatGPT 搜索展示；GPTBot 涉及模型训练，两者是独立控制项。是否允许 GPTBot 应由站点所有者确认，不能因为做 GEO 就默认放行所有训练用途。

同时确保 CDN / Nginx / WAF 没有按 User-Agent 或 IP 错误拦截目标爬虫。

#### 5.5 低成本增加 llms.txt

新增 `public/llms.txt`，只做网站说明和核心页面导航，不堆关键词、不复制整站内容：

```md
# 东波哥

> 杨东波（东波哥）的个人官网，内容聚焦企业 AI 培训、AI 办公提效、智能体应用与企业数字化转型。

## Core pages

- [关于东波哥](https://dongboge.cn/about/): 个人经历、专业方向与公开身份信息
- [企业 AI 服务](https://dongboge.cn/services/): 培训、咨询与智能体服务说明
- [培训案例](https://dongboge.cn/training-cases/): 已公开的培训案例
- [技术博客](https://dongboge.cn/blog/): 教程、案例和行业观点
```

该文件属于实验性辅助，不作为验收成功的核心指标。

### Phase 2：内容集群与引用格式（第 2～4 周，P1）

#### 5.6 先建立“事实库”

新增内部维护文档，统一以下口径：

- 人物姓名、常用名、职业定位、公开履历。
- 公司全称、成立时间、服务范围。
- 可公开的客户、案例、课程名称、时间与结果。
- 可验证的服务数量、学员数量、客户评价。
- 所有资质、协会任职及其公开来源链接。

没有证据的数据标记为“不可对外使用”。官网、Schema、案例、媒体资料和第三方简介均从事实库取值，避免 AI 交叉验证时出现矛盾。

#### 5.7 建立三类内容集群

首期聚焦与业务咨询直接相关的主题，避免继续用大量泛日记稀释专业主题。

**集群 A：企业 AI 培训选型**

- 企业 AI 培训是什么？适合哪些部门？
- 企业 AI 培训课程如何设计？
- 广州企业 AI 培训机构怎么选？
- 企业 AI 内训一天多少钱？报价由什么决定？
- 企业做 AI 培训前要准备什么？

**集群 B：AI 办公提效落地**

- 银行员工如何用 AI 提升办公效率？
- 销售、行政、人力、运营分别适合哪些 AI 场景？
- 企业如何制定 AI 使用规范与数据安全边界？
- AI 办公培训后如何衡量效果？

**集群 C：智能体与 Dify 应用**

- 企业为什么需要 AI 智能体？
- Dify 适合哪些企业场景？
- 智能体定制开发与标准 SaaS 如何选择？
- 企业知识库问答系统如何落地？

每个集群建立一个支柱页，连接 4～8 篇问题页；问题页反向链接支柱页、服务页和相关案例页。

#### 5.8 使用可引用的文章模板

新文章和重点旧文章按以下结构重写：

1. **直接答案**：开头 40～80 字回答标题问题。
2. **适用对象**：明确行业、岗位、规模和使用边界。
3. **核心要点**：3～7 条编号列表。
4. **对比或决策表**：只比较可验证维度，注明数据日期和来源。
5. **步骤 / 清单**：给出可执行方法。
6. **案例证据**：时间、对象、问题、动作、结果；未获授权则匿名。
7. **限制与风险**：明确不适用场景，提升可信度。
8. **作者与更新信息**：作者页、发布日期、修改日期、引用来源。

标题优先使用真实问题，例如“企业 AI 培训后如何衡量效果？”，不要把每个标题都写成品牌广告。品牌名自然出现在作者、案例或服务说明中即可。

#### 5.9 重点页面改造顺序

1. 首页：用可见内容回答“东波哥是谁、提供什么、服务谁、有什么证据”。
2. 关于页：升级为权威人物页，统一公开履历、专业领域和外部身份链接。
3. 服务页：按服务拆分独立页面，每页说明适用对象、交付物、流程、边界和案例。
4. 培训案例页：每个案例使用“背景—问题—方案—结果—证据”结构，并增加独立可索引详情页。
5. 博客：优先改造与三个内容集群最相关的 10 篇，不做全库一次性重写。

### Phase 3：第三方信源与品牌一致性（第 2～8 周，P1）

AI 的可信度来自多来源一致，而不是官网自述重复。建议：

- 完善公众号、视频号、抖音、行业协会、活动主办方等公开主页，名称统一为“杨东波（东波哥）/ 广州塔哥科技有限公司”。
- 争取客户或活动主办方发布真实的课程介绍、讲师介绍、活动回顾或案例评价，并链接官网相关页面。
- 将公开演讲、课程资料、行业文章和活动页面链接回作者页或专题页。
- `sameAs` 只填写真实、公开、稳定、本人或公司可控制的页面。
- 不批量制造低质量软文，不购买虚假测评，不伪造客户数据。

### Phase 4：监测与迭代（持续，P2）

#### 5.10 建立固定问题集

首期选择 30 个问题，分三层：

- 品牌认知：东波哥是谁？广州塔哥科技做什么？
- 品类推荐：广州有哪些企业 AI 培训讲师？企业 AI 培训机构怎么选？
- 场景决策：银行如何开展 AI 办公培训？Dify 培训适合哪些团队？

每周在目标平台使用新会话测试，记录：回答日期、平台、模型、是否提及品牌、品牌排序、描述是否准确、是否引用、引用 URL、竞品、负面或错误事实。

#### 5.11 建立闭环

| 监测结果 | 处理动作 |
| --- | --- |
| AI 不认识品牌 | 检查抓取、索引、实体页和第三方公开信息 |
| 认识但不推荐 | 增加高意图问题页、案例证据和第三方评价 |
| 推荐但信息错误 | 修正官网事实库和 Schema，补充权威外部来源 |
| 引用竞品页面 | 分析其回答结构和证据，制作更完整的对比/场景页 |
| 引用率下降 | 检查内容时效、页面可访问性、竞品新增内容和模型变化 |

Google Search Console 用于观察搜索抓取、索引与 AI 搜索相关表现；ChatGPT、Perplexity、豆包、Kimi 等平台仍需以固定问题人工或合规自动化测试为主。

## 6. 建议修改文件清单

| 文件 / 模块 | 建议改动 | 优先级 |
| --- | --- | --- |
| `src/content.config.ts` | slug 必填；增加 author、reviewedDate、references 等字段 | P0 |
| `src/utils/contentUtils.ts` | 增加唯一 URL 生成函数 | P0 |
| `src/pages/blog/[...slug].astro` | 统一 slug、传递文章 Schema 所需字段 | P0 |
| `src/layouts/BlogPost.astro` | `zh-CN`、BlogPosting、作者卡、BreadcrumbList | P0 |
| `src/components/BaseHead.astro` | 支持文章类型、作者、时间、绝对图片 URL | P0 |
| `src/pages/blog/index.astro` | 内链统一使用 frontmatter slug | P0 |
| `src/pages/index.astro` | 内链统一；移除为关键词而设的隐藏文案，改为可见内容 | P0 |
| `src/components/BlogNavigation.astro` | 上下篇链接统一使用 slug | P0 |
| `scripts/modules/sitemap-generator.js` | 保留为权威 sitemap 流程并校验重复 slug | P0 |
| `scripts/generate-complete-sitemap.js` | 修正为读取 slug 或停止使用 | P0 |
| `public/robots.txt` | 显式记录 AI 搜索爬虫策略 | P0 |
| `public/llms.txt` | 增加实验性网站目录 | P1 |
| `src/pages/about.astro` | ProfilePage + 统一实体事实 | P1 |
| `src/pages/services.astro` | 服务定义、FAQ 可见内容、案例内链 | P1 |
| `src/pages/training-cases*.astro` | 案例详情、可验证结果和独立 URL | P1 |
| `scripts/seo-health-check.js` | 增加 slug、lang、Schema、AI 爬虫和 llms.txt 检查 | P1 |

## 7. 验收清单

> 实施状态（2026-06-22）：代码、内容集群、事实库、服务/案例详情页和本地监测基线已完成。标记为“上线后”的项目需要部署到生产环境后验证，不能用本地构建结果代替。

### 技术验收

- [x] `npm run build` 成功。
- [x] `npx astro check` 无新增错误。
- [x] 所有内容都有唯一 slug，站内链接、Canonical、RSS、sitemap 使用同一 URL。
- [x] 核心页面本地返回 200，旧文件名 URL 通过永久重定向指向规范 slug。
- [x] 中文页面 `lang="zh-CN"`。
- [x] robots.txt、sitemap.xml、sitemap-index.xml、rss.xml、llms.txt 在本地运行态可访问。
- [ ] 上线后确认 Nginx / CDN / WAF 未误拦截目标爬虫。
- [x] OAI-SearchBot、GPTBot、ChatGPT-User、PerplexityBot 的站点抓取策略已明确。
- [ ] 上线后使用 Schema Markup Validator 与 Google Rich Results Test 验证公开 URL。
- [x] 本地检查的 JSON-LD 均可解析，页面正文在禁用 JavaScript 后仍可读取。

### 内容验收

- [x] 人物、公司、服务、履历和案例数据来自统一事实库。
- [x] Schema 内容与页面可见正文一致。
- [x] 首页、关于页、服务页均有直接、清晰的实体定义。
- [x] 已建立 3 个支柱页和 10 个问题页，采用“直接答案—要点—证据—边界—作者”模板。
- [x] 重点内容连接支柱页、服务/案例页和相关内容。
- [x] 对比表只使用可核验维度，不使用无法验证的结论。
- [x] 新增内容的图片 alt 描述自然，不堆关键词。

### 监测验收

- [x] 建立 30 个固定问题的 GEO 监测表。
- [ ] 每次测试记录平台、模型/模式、日期和引用 URL。
- [ ] 每周复核错误事实和引用变化，每月复盘内容与业务咨询。

上线后的运行态、第三方平台和持续监测工作见 `docs/GEO上线后验证清单.md`。

## 8. 风险与边界

- 没有任何 Schema、robots 或 llms.txt 配置能保证 AI 推荐或引用。
- 不同 AI 产品的索引、检索和生成机制不同，结果会随时间、地区、账号和模型变化。
- GEO 结果不能只用一次提问判断，应使用固定问题集和多次测试观察趋势。
- 第三方提及必须真实；批量伪造评论、案例和数据会同时损害搜索与 AI 信任。
- 网站是中文业务站，应优先服务真实中文客户问题；如果未来拓展海外市场，再建立独立英文内容与 `hreflang`，不建议机器直译批量铺页。

## 9. 官方参考

- [OpenAI Crawlers：OAI-SearchBot、GPTBot 与 ChatGPT-User](https://platform.openai.com/docs/bots/)
- [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-overviews)
- [Google：Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google：Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [llms.txt 社区提案](https://llmstxt.org/)
