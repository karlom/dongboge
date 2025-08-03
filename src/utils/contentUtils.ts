import { getCollection } from "astro:content";
import { cdnUrl } from "../cdnConfig";

/**
 * 处理博客集合，将图片路径转换为CDN路径
 */
export async function getProcessedBlogCollection() {
    const posts = await getCollection("blog");

    // 处理每篇博客的heroImage路径
    return posts.map(post => {
        // 如果存在heroImage且是字符串路径
        if (post.data.heroImage && typeof post.data.heroImage === 'string') {
            // 处理相对路径
            if (post.data.heroImage.startsWith('../../assets/')) {
                const normalizedPath = post.data.heroImage.replace('../../assets/', '/assets/');
                post.data.heroImage = cdnUrl(normalizedPath);
            }
        }
        return post;
    });
}