# GEO 上线后验证清单

本清单只包含无法由本地开发环境替代的生产验证与持续运营任务。

## 部署后 24 小时内

- [ ] 确认首页、关于页、服务页、4 个服务详情页、案例列表、6 个案例详情页和 13 篇内容集群文章均返回 200。
- [ ] 抽查旧文件名博客 URL，确认最终跳转到 frontmatter slug 对应的规范 URL。
- [ ] 确认 `/robots.txt`、`/llms.txt`、`/sitemap.xml`、`/sitemap-index.xml`、`/rss.xml` 返回 200，且 CDN 内容与仓库一致。
- [ ] 检查 Nginx、CDN、WAF 日志和规则，确认未按 User-Agent 或 IP 误拦截目标搜索爬虫。
- [ ] 在 Schema Markup Validator 验证首页、关于页、一个服务页、一个案例页和一篇支柱文章。
- [ ] 在 Google Rich Results Test 验证一篇博客文章，处理严重错误。
- [ ] 在 Google Search Console 重新提交 `https://dongboge.cn/sitemap-index.xml`。

## 上线后 7 天内

- [ ] 使用 `docs/GEO监测问题集.csv` 在目标平台建立首轮基线，填写平台、模型/模式、日期、品牌提及、引用 URL 和错误事实。
- [ ] 核对公众号、视频号、活动主办方等公开主页中的姓名、公司、服务和履历口径；只添加真实可控页面到 `sameAs`。
- [ ] 检查 Search Console 的抓取、索引和 sitemap 状态，记录未收录页面及原因。

## 持续执行

- [ ] 每周复测固定问题并复核错误事实、引用变化和竞品来源。
- [ ] 每月复盘搜索曝光、AI 引用、有效咨询和内容转化，决定下一批内容更新。
- [ ] 事实、案例或履历变化时，先更新 `docs/GEO事实库.md`，再同步页面和 Schema。
