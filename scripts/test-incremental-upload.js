#!/usr/bin/env node

/**
 * 测试增量上传脚本
 * 
 * 这个脚本用于测试增量上传功能，创建一些测试文件并模拟上传过程
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试目录
const testDir = path.join(__dirname, '../test-upload');
const manifestPath = path.join(__dirname, '../.test-upload-manifest.json');

// 创建测试目录
async function createTestDirectory() {
    console.log('创建测试目录...');

    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    // 创建assets目录
    const assetsDir = path.join(testDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 创建fonts目录
    const fontsDir = path.join(testDir, 'fonts');
    if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
    }

    // 创建images目录
    const imagesDir = path.join(testDir, 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    // 创建测试文件
    createTestFile(path.join(assetsDir, 'style1.css'), '/* CSS文件1 */');
    createTestFile(path.join(assetsDir, 'style2.css'), '/* CSS文件2 */');
    createTestFile(path.join(fontsDir, 'font1.woff'), 'FONT1-DATA');
    createTestFile(path.join(fontsDir, 'font2.woff'), 'FONT2-DATA');
    createTestFile(path.join(imagesDir, 'image1.jpg'), 'IMAGE1-DATA');
    createTestFile(path.join(imagesDir, 'image2.jpg'), 'IMAGE2-DATA');

    console.log('测试目录创建完成');
}

// 创建测试文件
function createTestFile(filePath, content) {
    fs.writeFileSync(filePath, content);
    console.log(`创建测试文件: ${filePath}`);
}

// 计算文件哈希值
function calculateFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

// 创建清单文件
function createManifest() {
    console.log('创建清单文件...');

    const manifest = {};

    // 遍历测试目录中的所有文件
    function processDirectory(dir, baseDir = testDir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                processDirectory(fullPath, baseDir);
            } else {
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                const hash = calculateFileHash(fullPath);
                manifest[relativePath] = hash;
                console.log(`添加文件到清单: ${relativePath} (${hash})`);
            }
        }
    }

    processDirectory(testDir);

    // 保存清单文件
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`清单文件已保存到: ${manifestPath}`);

    return manifest;
}

// 模拟文件变化
function simulateFileChanges() {
    console.log('\n模拟文件变化...');

    // 修改一个文件
    const cssFile = path.join(testDir, 'assets', 'style1.css');
    fs.writeFileSync(cssFile, '/* CSS文件1 - 已修改 */');
    console.log(`修改文件: ${cssFile}`);

    // 添加一个新文件
    const newFile = path.join(testDir, 'assets', 'style3.css');
    fs.writeFileSync(newFile, '/* CSS文件3 - 新文件 */');
    console.log(`添加新文件: ${newFile}`);

    // 不修改其他文件
    console.log('其他文件保持不变');
}

// 检测文件变化
function detectChanges(originalManifest) {
    console.log('\n检测文件变化...');

    const changes = {
        modified: [],
        added: [],
        unchanged: []
    };

    // 遍历测试目录中的所有文件
    function processDirectory(dir, baseDir = testDir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                processDirectory(fullPath, baseDir);
            } else {
                const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                const hash = calculateFileHash(fullPath);

                if (!originalManifest[relativePath]) {
                    changes.added.push(relativePath);
                    console.log(`新增文件: ${relativePath}`);
                } else if (originalManifest[relativePath] !== hash) {
                    changes.modified.push(relativePath);
                    console.log(`修改文件: ${relativePath}`);
                } else {
                    changes.unchanged.push(relativePath);
                    console.log(`未变化文件: ${relativePath}`);
                }
            }
        }
    }

    processDirectory(testDir);

    // 打印变化摘要
    console.log('\n变化摘要:');
    console.log(`- 新增文件: ${changes.added.length}`);
    console.log(`- 修改文件: ${changes.modified.length}`);
    console.log(`- 未变化文件: ${changes.unchanged.length}`);

    return changes;
}

// 主函数
async function main() {
    console.log('===== 测试增量上传功能 =====\n');

    try {
        // 创建测试目录和文件
        await createTestDirectory();

        // 创建初始清单
        const originalManifest = createManifest();

        // 模拟文件变化
        simulateFileChanges();

        // 检测文件变化
        const changes = detectChanges(originalManifest);

        console.log('\n测试完成！');
        console.log('在实际的增量上传中，只有新增和修改的文件会被上传，未变化的文件会被跳过。');
        console.log(`这意味着在本次测试中，只有 ${changes.added.length + changes.modified.length} 个文件会被上传，而不是全部 ${changes.added.length + changes.modified.length + changes.unchanged.length} 个文件。`);

        // 清理测试文件
        console.log('\n是否要清理测试文件？(保留测试文件以便手动检查)');

    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

// 执行主函数
main().catch(error => {
    console.error('执行脚本时发生错误:', error);
});