import { getCollection } from "astro:content";
import { cdnUrl } from "../cdnConfig";

/**
 * 处理博客集合，将图片路径转换为CDN路径
 */
export async function getProcessedBlogCollection() {
    const posts = await getCollection("blog");

    // 处理每篇博客的heroImage路径
    return posts.map(post => {
        // 如果存在heroImage
        if (post.data.heroImage) {
            let imagePath: string;

            // 如果heroImage是对象（Astro图片），获取src属性
            if (typeof post.data.heroImage === 'object' && 'src' in post.data.heroImage) {
                imagePath = post.data.heroImage.src;
            } else if (typeof post.data.heroImage === 'string') {
                imagePath = post.data.heroImage;
            } else {
                imagePath = '';
            }

            // 如果是相对路径，转换为正确的CDN路径
            if (imagePath && typeof imagePath === 'string') {
                // 处理 ../../assets/ 格式的路径
                if (imagePath.includes('../../assets/')) {
                    imagePath = imagePath.replace('../../assets/', '/assets/');
                }
                // 处理 ../assets/ 格式的路径
                else if (imagePath.includes('../assets/')) {
                    imagePath = imagePath.replace('../assets/', '/assets/');
                }
                // 如果不是完整URL，使用CDN路径
                if (!imagePath.startsWith('http')) {
                    imagePath = cdnUrl(imagePath);
                }

                // 将处理后的路径赋值回去
                (post.data as any).heroImage = imagePath;
            }
        }
        return post;
    });
}
