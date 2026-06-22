// @ts-check

import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import fs from 'node:fs';
import path from 'node:path';
import {
	defineConfig
} from 'astro/config';

function getLegacyBlogRedirects() {
	const blogDir = path.resolve('src/content/blog');
	/** @type {Record<string, string | { status: 301, destination: string }>} */
	const redirects = {};

	for (const file of fs.readdirSync(blogDir)) {
		if (!/\.mdx?$/.test(file)) continue;
		const content = fs.readFileSync(path.join(blogDir, file), 'utf8');
		const slug = content.match(/^slug:\s*["']?([^"'\n]+)["']?/m)?.[1]?.trim();
		const fileName = file.replace(/\.mdx?$/, '');
		if (slug && slug !== fileName) {
			/** @type {{ status: 301, destination: string }} */
			const redirect = {
				status: 301,
				destination: `/blog/${slug}/`,
			};
			redirects[`/blog/${fileName}/`] = redirect;
		}
	}

	return redirects;
}

/** @typedef {{ type?: string, tagName?: string, children?: HtmlNode[] }} HtmlNode */
/** @returns {(tree: HtmlNode) => void} */
function demoteMarkdownH1() {
	return (tree) => {
		/** @param {HtmlNode} node */
		const visit = (node) => {
			if (node?.type === 'element' && node.tagName === 'h1') {
				node.tagName = 'h2';
			}
			for (const child of node?.children ?? []) visit(child);
		};
		visit(tree);
	};
}

// https://astro.build/config
export default defineConfig({
	site: 'https://dongboge.cn',
	output: 'server', // 服务端渲染模式
	adapter: node({
		mode: 'standalone'
	}),
	trailingSlash: 'always',
	redirects: getLegacyBlogRedirects(),
	markdown: {
		rehypePlugins: [demoteMarkdownH1],
	},
	integrations: [
		mdx(),
		tailwind()
	],
	// 配置Vite选项
	vite: {
		// 定义环境变量，确保在构建时可用
		define: {
			'import.meta.env.PUBLIC_CDN_URL': JSON.stringify('https://cdn.dongboge.cn'),
		},
	},
});
