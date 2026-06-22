export const servicePages = [
  {
    slug: "enterprise-ai-training",
    name: "企业 AI 培训",
    description: "围绕管理认知、岗位提效、数据安全和 AI 落地设计企业内训与工作坊。",
    audience: "希望统一 AI 认知、找到岗位场景并推动员工实际使用的企业团队。",
    deliverables: ["培训需求与岗位场景清单", "定制课纲与脱敏练习", "实操模板与复核清单", "前后测与课后试点建议"],
    process: ["访谈业务负责人", "收集并脱敏任务样本", "设计分层课程", "现场实操与复盘", "跟踪试点结果"],
    boundaries: "培训不替代数据治理、法律合规和长期流程改造；量化效果以客户自己的前后测记录为准。",
    related: "/blog/enterprise-ai-training-guide/",
  },
  {
    slug: "ai-consulting",
    name: "企业 AI 技术咨询",
    description: "评估业务流程、数据条件、工具选型与实施成本，形成可验证的 AI 落地路线。",
    audience: "已有 AI 方向但缺少场景优先级、技术路线或项目验收标准的企业。",
    deliverables: ["业务场景机会清单", "风险与数据条件评估", "技术选型建议", "试点路线与验收指标"],
    process: ["明确业务目标", "梳理流程与数据", "评估价值和风险", "设计最小试点", "复盘后决定扩展"],
    boundaries: "咨询结论依赖客户提供的信息和当时可用技术条件；高风险行业需由客户法务、合规和安全负责人共同评审。",
    related: "/blog/enterprise-ai-productivity-guide/",
  },
  {
    slug: "ai-agent-development",
    name: "AI 智能体定制开发",
    description: "针对边界明确、可验证的企业任务，设计连接知识、工具和人工复核节点的智能体。",
    audience: "标准 SaaS 无法满足流程、权限或系统集成要求，且业务流程已经过原型验证的团队。",
    deliverables: ["需求与验收标准", "可测试原型", "权限与异常处理设计", "部署、测试与运维说明"],
    process: ["限定任务范围", "准备测试样本", "制作原型", "真实问题评测", "分阶段接入生产环境"],
    boundaries: "不可逆操作和高风险决定必须保留人工确认；系统上线后仍需知识更新、质量监控和权限审计。",
    related: "/blog/custom-ai-agent-vs-saas/",
  },
  {
    slug: "dify-implementation",
    name: "Dify 应用与部署",
    description: "使用 Dify 验证企业知识库、文本处理与 AI 工作流，并按数据和运维要求选择部署方式。",
    audience: "需要快速验证 AI 工作流、企业知识库或内部助手的业务与技术团队。",
    deliverables: ["Dify 场景与架构建议", "知识库或工作流原型", "测试问题集", "部署与维护说明"],
    process: ["选择低风险场景", "整理权威资料", "配置工作流", "测试引用和拒答", "完善权限与运营机制"],
    boundaries: "Dify 是实现工具，不会自动修复资料过期、权限混乱或业务规则不清；生产部署需结合安全、成本和可用性要求。",
    related: "/blog/enterprise-ai-agent-dify-guide/",
  },
] as const;

export type ServicePage = (typeof servicePages)[number];
