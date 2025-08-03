// 上传静态资源到腾讯云COS的脚本
import COS from 'cos-nodejs-sdk-v5';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置信息从环境变量获取
const SecretId = process.env.TENCENT_SECRET_ID;
const SecretKey = process.env.TENCENT_SECRET_KEY;
const Bucket = process.env.TENCENT_COS_BUCKET;
const Region = process.env.TENCENT_COS_REGION || 'ap-guangzhou';

// 初始化COS实例
const cos = new COS({
    SecretId,
    SecretKey,
});

// 递归获取目录下的所有文件
async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await stat(filePath);

        if (stats.isDirectory()) {
            arrayOfFiles = await getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    }

    return arrayOfFiles;
}

// 上传单个文件
async function uploadFile(filePath, basePath) {
    const relativePath = path.relative(basePath, filePath);
    const key = relativePath.replace(/\\/g, '/'); // 确保路径分隔符为 /

    console.log(`上传文件: ${filePath} -> ${key}`);

    return new Promise((resolve, reject) => {
        cos.putObject({
            Bucket,
            Region,
            Key: key,
            Body: fs.createReadStream(filePath),
            ContentLength: fs.statSync(filePath).size,
        }, (err, data) => {
            if (err) {
                console.error(`上传失败: ${filePath}`, err);
                reject(err);
                return;
            }
            console.log(`上传成功: ${key}`);
            resolve(data);
        });
    });
}

// 上传目录
async function uploadDirectory(dirPath, targetPath) {
    console.log(`开始上传目录: ${dirPath} -> ${targetPath}`);

    try {
        // 获取目录下所有文件
        const files = await getAllFiles(dirPath);

        // 并行上传所有文件
        const uploadPromises = files.map(file => uploadFile(file, path.dirname(dirPath)));
        await Promise.all(uploadPromises);

        console.log(`目录上传完成: ${dirPath}`);
    } catch (error) {
        console.error(`上传目录失败: ${dirPath}`, error);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        // 检查环境变量
        if (!SecretId || !SecretKey || !Bucket) {
            console.error('缺少必要的环境变量: TENCENT_SECRET_ID, TENCENT_SECRET_KEY, TENCENT_COS_BUCKET');
            process.exit(1);
        }

        // 上传静态资源目录
        const distPath = path.resolve(__dirname, '../dist');
        await uploadDirectory(path.join(distPath, 'assets'), 'assets');
        await uploadDirectory(path.join(distPath, 'fonts'), 'fonts');

        console.log('所有文件上传完成!');
    } catch (error) {
        console.error('上传过程中发生错误:', error);
        process.exit(1);
    }
}

// 执行主函数
main();