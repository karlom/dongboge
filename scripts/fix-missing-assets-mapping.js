#!/usr/bin/env node

/**
 * 修复缺失的assets映射
 * 为_astro目录下的图片创建对应的assets映射
 */

import fs from 'fs';
import path from 'path';

// 手动加载.env文件
function loadEnvFile() {
    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

loadEnvFile();

// 检查COS SDK是否可用
function checkCOSSDK() {
    try {
        require.resolve('cos-nodejs-sdk-v5');
        return true;
    } catch (error) {
        console.warn('⚠️ COS SDK未安装，无法修复映射');
        return false;
    }
}

// 加载assets映射清单
function loadAssetsMappingManifest() {
    const manifestPath = '.assets-mapping-manifest.json';

    try {
        if (fs.existsSync(manifestPath)) {
            const content = fs.readFileSync(manifestPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn('⚠️ 无法加载assets映射清单，将创建新的清单');
    }

    return {};
}

// 保存assets映射清单
function saveAssetsMappingManifest(manifest) {
    const manifestPath = '.assets-mapping-manifest.json';

    try {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('💾 assets映射清单已保存');
    } catch (error) {
        console.warn('⚠️ 无法保存assets映射清单:', error.message);
    }
}

// 列出CDN上_astro目录下的所有图片文件
async function listAstroImages(cos) {
    try {
        const result = await new Promise((resolve, reject) => {
            cos.getBucket({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Prefix: '_astro/',
                MaxKeys: 1000
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        // 过滤出图片文件
        const imageFiles = result.Contents.filter(item =>
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.Key)
        ).map(item => item.Key);

        return imageFiles;
    } catch (error) {
        console.error('❌ 获取_astro目录文件列表失败:', error.message);
        return [];
    }
}

// 检查assets文件是否存在
async function checkAssetsFileExists(cos, filePath) {
    try {
        await new Promise((resolve, reject) => {
            cos.headObject({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: filePath
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return true;
    } catch (error) {
        return false;
    }
}

// 创建assets映射
async function createAssetsMapping(cos, astroFile, assetsPath) {
    try {
        await new Promise((resolve, reject) => {
            cos.putObjectCopy({
                Bucket: process.env.TENCENT_COS_BUCKET,
                Region: process.env.TENCENT_COS_REGION || 'ap-guangzhou',
                Key: assetsPath,
                CopySource: `${process.env.TENCENT_COS_BUCKET}.cos.${process.env.TENCENT_COS_REGION || 'ap-guangzhou'}.myqcloud.com/${astroFile}`,
                Headers: {
                    'Cache-Control': 'max-age=31536000',
                }
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return true;
    } catch (error) {
        console.error(`❌ 创建映射失败: ${astroFile} -> ${assetsPath}`, error.message);
        return false;
    }
}

// 主修复函数
async function fixMissingAssetsMappings() {
    console.log('🔧 开始修复缺失的assets映射...\n');

    try {
        // 检查环境变量
        const requiredEnvs = ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_COS_BUCKET'];
        const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

        if (missingEnvs.length > 0) {
            console.error(`❌ 缺少必要的环境变量: ${missingEnvs.join(', ')}`);
            return;
        }

        // 检查COS SDK
        if (!checkCOSSDK()) {
            return;
        }

        // 初始化COS客户端
        const COS = require('cos-nodejs-sdk-v5');
        const cos = new COS({
            SecretId: process.env.TENCENT_SECRET_ID,
            SecretKey: process.env.TENCENT_SECRET_KEY,
        });

        console.log(`📦 连接COS Bucket: ${process.env.TENCENT_COS_BUCKET}`);
        console.log(`🌍 区域: ${process.env.TENCENT_COS_REGION || 'ap-guangzhou'}\n`);

        // 1. 获取_astro目录下的所有图片文件
        console.log('📋 获取_astro目录下的图片文件...');
        const astroImages = await listAstroImages(cos);
        console.log(`找到 ${astroImages.length} 个_astro图片文件\n`);

        if (astroImages.length === 0) {
            console.log('✅ _astro目录下没有图片文件，无需修复映射');
            return;
        }

        // 2. 加载本地映射清单
        const mappingManifest = loadAssetsMappingManifest();

        // 3. 检查并修复缺失的映射
        console.log('🔍 检查并修复缺失的映射:');
        console.log('='.repeat(80));

        let fixedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const astroFile of astroImages) {
            const fileName = path.basename(astroFile);
            const assetsPath = `assets/${fileName}`;

            // 检查assets文件是否已存在
            const assetsExists = await checkAssetsFileExists(cos, assetsPath);

            if (assetsExists) {
                console.log(`⏭️ ${assetsPath} - 已存在，跳过`);
                skippedCount++;

                // 确保本地清单中有记录
                if (!mappingManifest[assetsPath]) {
                    mappingManifest[assetsPath] = {
                        sourceFile: astroFile,
                        createdAt: new Date().toISOString(),
                        fileName: fileName,
                        fixedBy: 'fix-missing-assets-mapping'
                    };
                }
            } else {
                console.log(`📤 创建映射: ${astroFile} -> ${assetsPath}`);

                const success = await createAssetsMapping(cos, astroFile, assetsPath);

                if (success) {
                    console.log(`✅ 映射创建成功: ${assetsPath}`);
                    fixedCount++;

                    // 更新本地清单
                    mappingManifest[assetsPath] = {
                        sourceFile: astroFile,
                        createdAt: new Date().toISOString(),
                        fileName: fileName,
                        fixedBy: 'fix-missing-assets-mapping'
                    };
                } else {
                    console.log(`❌ 映射创建失败: ${assetsPath}`);
                    failedCount++;
                }
            }
        }

        // 4. 保存更新后的清单
        if (fixedCount > 0 || skippedCount > 0) {
            saveAssetsMappingManifest(mappingManifest);
        }

        // 5. 输出修复结果
        console.log('='.repeat(80));
        console.log('\n📊 修复结果统计:');
        console.log(`  🎯 检查的文件总数: ${astroImages.length}`);
        console.log(`  ✅ 成功修复: ${fixedCount}`);
        console.log(`  ⏭️ 已存在跳过: ${skippedCount}`);
        console.log(`  ❌ 修复失败: ${failedCount}`);

        if (fixedCount > 0) {
            console.log(`\n🎉 成功修复了 ${fixedCount} 个缺失的assets映射！`);
        } else if (skippedCount === astroImages.length) {
            console.log('\n✅ 所有映射都已存在，无需修复！');
        }

        if (failedCount > 0) {
            console.log('\n⚠️ 部分映射修复失败，请检查网络连接和权限设置');
        }

    } catch (error) {
        console.error('❌ 修复失败:', error.message);
        console.error(error.stack);
    }
}

// 运行修复
fixMissingAssetsMappings();