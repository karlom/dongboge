// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import {
	defineConfig
} from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://dongboge.com',
	output: 'server', // 服务端渲染模式
	adapter: node({
		mode: 'standalone'
	}),
	integrations: [
		mdx(),
		sitemap(),
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