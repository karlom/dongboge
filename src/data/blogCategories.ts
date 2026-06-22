export const BLOG_CATEGORIES = [
  "企业 AI 培训",
  "AI 应用与智能体",
  "技术实践",
  "工作与商业",
  "生活与成长",
  "摘录与思考",
  "成功记录与复盘",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
