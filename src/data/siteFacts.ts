export const SITE_URL = "https://dongboge.cn";
export const PERSON_ID = `${SITE_URL}/#person`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const siteFacts = {
  person: {
    name: "杨东波",
    alternateName: "东波哥",
    jobTitle: "企业 AI 培训师",
    description:
      "杨东波（东波哥）是广州塔哥科技有限公司创始人，长期从事软件开发、技术管理与企业 AI 培训，内容聚焦 AI 办公提效、智能体应用和企业数字化转型。",
    image: `${SITE_URL}/yangdongbo.jpg`,
    url: `${SITE_URL}/about/`,
    knowsAbout: [
      "企业 AI 培训",
      "AI 办公提效",
      "AI 智能体应用",
      "Dify",
      "企业数字化转型",
    ],
  },
  organization: {
    name: "广州塔哥科技有限公司",
    description:
      "面向企业提供 AI 培训、AI 技术咨询、智能体定制与 Dify 应用服务。",
    url: SITE_URL,
    logo: `${SITE_URL}/images/index-logo.png`,
    addressLocality: "广州",
    addressRegion: "广东省",
    addressCountry: "CN",
  },
  services: [
    "企业 AI 培训",
    "AI 技术咨询",
    "智能体定制开发",
    "Dify 应用与部署",
  ],
} as const;

export const personSchema = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: siteFacts.person.name,
  alternateName: siteFacts.person.alternateName,
  description: siteFacts.person.description,
  jobTitle: siteFacts.person.jobTitle,
  url: siteFacts.person.url,
  image: siteFacts.person.image,
  knowsAbout: siteFacts.person.knowsAbout,
  worksFor: { "@id": ORGANIZATION_ID },
};

export const organizationSchema = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: siteFacts.organization.name,
  description: siteFacts.organization.description,
  url: siteFacts.organization.url,
  logo: {
    "@type": "ImageObject",
    url: siteFacts.organization.logo,
  },
  founder: { "@id": PERSON_ID },
  address: {
    "@type": "PostalAddress",
    addressLocality: siteFacts.organization.addressLocality,
    addressRegion: siteFacts.organization.addressRegion,
    addressCountry: siteFacts.organization.addressCountry,
  },
};

export const websiteSchema = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: "东波哥",
  description: siteFacts.person.description,
  inLanguage: "zh-CN",
  publisher: { "@id": ORGANIZATION_ID },
};

export function createGraph(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function createBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
