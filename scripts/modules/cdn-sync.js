/**
 * CDN同步模块
 * 基于现有的optimized-cos-upload.cjs，只上传变化的资源
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
    execSync
} from 'child_process';

// 手动加载.env文件（仅在本地环境）
function loadEnvFile() {
    // 在CI/CD环境中不加载.env文件，使用GitHub Secrets
    if (process.env.GITHUB_ACTIONS) {
        return;
    }

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
        // 检查是否安装了cos-nodejs-sdk-v5
        execSync('npm list cos-nodejs-sdk-v5', {
            stdio: 'pipe'
        });
        return true;
    } catch (error) {
        console.warn('⚠️ COS SDK未安装，将跳过CDN同步');
        return false;
    }
}

// 计算文件哈希
async function calculateFileHash(filePath) {
    try {
        const stats = fs.statSync(filePath);

        // 对于小文件，直接读取内容计算哈希
        if (stats.size < 1024 * 1024) { // 1MB以下
            const content = fs.readFileSync(filePath);
            return crypto.createHash('md5').update(content).digest('hex');
        }

        // 对于大文件，使用流式处理
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath, {
                highWaterMark: 64 * 1024
            }); // 64KB chunks

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    } catch (error) {
        console.warn(`⚠️ 无法计算文件哈希: ${filePath}`, error.message);
        return null;
    }
}

// 加载上传清单
async function loadUploadManifest() {
    const manifestPath = '.upload-manifest-local.json';

    try {
        if (fs.existsSync(manifestPath)) {
            const content = fs.readFileSync(manifestPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.warn('⚠️ 无法加载本地上传清单，将创建新的清单');
    }

    return {};
}

// 保存上传清单
async function saveUploadManifest(manifest) {
    const manifestPath = '.upload-manifest-local.json';

    try {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('💾 本地上传清单已保存');
    } catch (error) {
        console.warn('⚠️ 无法保存本地上传清单:', error.message);
    }
}

// 检查文件是否需要上传
async function shouldUploadFile(filePath, manifest) {
    try {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        const manifestEntry = manifest[relativePath];

        if (!manifestEntry) {
            // 新文件，需要上传
            return {
                shouldUpload: true,
                reason: '新文件'
            };
        }

        // 检查文件大小
        if (manifestEntry.size !== stats.size) {
            return {
                shouldUpload: true,
                reason: '文件大小变化'
            };
        }

        // 检查修改时间
        const currentMtime = stats.mtime.getTime();
        const manifestMtime = new Date(manifestEntry.mtime).getTime();

        if (currentMtime > manifestMtime) {
            // 文件被修改，计算哈希确认
            const currentHash = await calculateFileHash(filePath);
            if (currentHash && currentHash !== manifestEntry.hash) {
                return {
                    shouldUpload: true,
                    reason: '文件内容变化'
                };
            }
        }

        return {
            shouldUpload: false,
            reason: '文件未变化'
        };
    } catch (error) {
        console.warn(`⚠️ 检查文件时出错: ${filePath}`, error.message);
        return {
            shouldUpload: true,
            reason: '检查失败，强制上传'
        };
    }
}

// 使用现有的COS上传脚本
async function runCOSUpload(filesToUpload) {
    try {
        console.log('☁️ 使用现有的COS上传脚本...');

        // 检查现有的上传脚本
        const cosScriptPath = 'scripts/optimized-cos-upload.cjs';

        if (!fs.existsSync(cosScriptPath)) {
            throw new Error('COS上传脚本不存在');
        }

        // 创建临时的文件列表（如果需要的话）
        console.log(`📤 准备上传 ${filesToUpload.length} 个文件到COS...`);

        // 运行现有的COS上传脚本
        execSync(`node ${cosScriptPath}`, {
            stdio: 'inherit',
            env: {
                ...process.env,
                // 可以通过环境变量传递特定的文件列表
                UPLOAD_SPECIFIC_FILES: JSON.stringify(filesToUpload)
            }
        });

        console.log('✅ COS上传完成');
        return true;
    } catch (error) {
        console.error('❌ COS上传失败:', error.message);
        return false;
    }
}

// 过滤需要上传到CDN的文件
function filterCDNFiles(files) {
    const cdnExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.avif',
        '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
        '.pdf', '.zip'
    ];

    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return cdnExtensions.includes(ext);
    });
}

// 主CDN同步函数
export async function syncToCDN(changedAssets) {
    try {
        console.log('☁️ 开始CDN同步...');

        // 检查COS SDK
        if (!checkCOSSDK()) {
            console.log('⏭️ 跳过CDN同步（COS SDK不可用）');
            return {
                success: true,
                skipped: true
            };
        }

        // 检查环境变量
        const requiredEnvs = ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_COS_BUCKET'];
        const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

        if (missingEnvs.length > 0) {
            console.warn(`⚠️ 缺少CDN配置: ${missingEnvs.join(', ')}`);
            console.log('⏭️ 跳过CDN同步');
            return {
                success: true,
                skipped: true
            };
        }

        // 过滤需要上传到CDN的文件
        const cdnFiles = filterCDNFiles(changedAssets);

        if (cdnFiles.length === 0) {
            console.log('⏭️ 没有需要上传到CDN的文件');
            return {
                success: true,
                uploaded: 0
            };
        }

        console.log(`📋 需要检查的CDN文件: ${cdnFiles.length} 个`);

        // 加载上传清单
        const manifest = await loadUploadManifest();

        // 检查哪些文件需要上传
        const filesToUpload = [];

        for (const file of cdnFiles) {
            const check = await shouldUploadFile(file, manifest);

            if (check.shouldUpload) {
                filesToUpload.push(file);
                console.log(`  📤 ${file} - ${check.reason}`);
            } else {
                console.log(`  ⏭️ ${file} - ${check.reason}`);
            }
        }

        if (filesToUpload.length === 0) {
            console.log('✅ 所有CDN文件都是最新的，无需上传');
            return {
                success: true,
                uploaded: 0,
                skipped: cdnFiles.length
            };
        }

        console.log(`🚀 准备上传 ${filesToUpload.length} 个文件到CDN...`);

        // 运行COS上传
        const uploadSuccess = await runCOSUpload(filesToUpload);

        if (uploadSuccess) {
            // 更新本地清单
            const newManifest = {
                ...manifest
            };

            for (const file of filesToUpload) {
                try {
                    const stats = fs.statSync(file);
                    const hash = await calculateFileHash(file);
                    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');

                    newManifest[relativePath] = {
                        hash,
                        size: stats.size,
                        mtime: stats.mtime.toISOString(),
                        uploadTime: new Date().toISOString()
                    };
                } catch (error) {
                    console.warn(`⚠️ 无法更新清单条目: ${file}`);
                }
            }

            await saveUploadManifest(newManifest);

            console.log('✅ CDN同步完成');
            return {
                success: true,
                uploaded: filesToUpload.length,
                skipped: cdnFiles.length - filesToUpload.length,
                files: filesToUpload
            };
        } else {
            throw new Error('COS上传失败');
        }

    } catch (error) {
        console.error('❌ CDN同步失败:', error.message);

        // CDN同步失败不应该中断整个部署流程
        console.log('⚠️ CDN同步失败，但部署将继续');
        return {
            success: false,
            error: error.message
        };
    }
}

// 测试CDN连接
export async function testCDNConnection() {
    console.log('🧪 测试CDN连接...');

    try {
        // 检查环境变量
        const requiredEnvs = ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_COS_BUCKET'];
        const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

        if (missingEnvs.length > 0) {
            console.log(`❌ 缺少CDN配置: ${missingEnvs.join(', ')}`);
            return false;
        }

        // 检查COS SDK
        if (!checkCOSSDK()) {
            return false;
        }

        console.log('✅ CDN配置检查通过');
        console.log(`📦 COS Bucket: ${process.env.TENCENT_COS_BUCKET}`);
        console.log(`🌍 COS Region: ${process.env.TENCENT_COS_REGION || 'ap-guangzhou'}`);

        return true;
    } catch (error) {
        console.error('❌ CDN连接测试失败:', error.message);
        return false;
    }
}