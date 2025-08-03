// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.dongboge.cn',
	integrations: [
		mdx(),
		sitemap(),
		tailwind()
	],
	// 配置CDN资源路径
	build: {
		// 如果需要将构建输出到特定目录
		// outDir: './dist',
		assets: 'assets', // 静态资源目录
	},
	// 配置Vite选项
	vite: {
		build: {
			// 启用CSS代码分割
			cssCodeSplit: true,
			// 配置资源处理
			assetsInlineLimit: 4096, // 小于4kb的文件将被内联为base64
			// 配置rollup选项
			rollupOptions: {
				output: {
					// 配置静态资源输出
					assetFileNames: 'assets/[name].[hash][extname]',
					chunkFileNames: 'assets/[name].[hash].js',
					entryFileNames: 'assets/[name].[hash].js',
				},
			},
		},
	},
});
