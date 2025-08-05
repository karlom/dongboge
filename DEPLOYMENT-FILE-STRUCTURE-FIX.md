# 部署文件结构问题修复

## 问题描述

部署后服务器上的文件结构变成了：

```
/var/www/dongboge/
├── client/     # 客户端文件
├── deploy/     # 部署脚本
└── server/     # 服务端文件
```

但是缺少了根目录下的关键文件：

- ❌ `package.json` - Node.js项目配置文件
- ❌ `package-lock.json` - 依赖锁定文件
- ❌ `.env` - 环境变量文件

这导致部署时报错：`❌ 关键文件缺失: package.json`

## 问题原因

当前的rsync配置只传输了以下内容：

1. `dist/` → `/var/www/dongboge/` (构建文件)
2. `deploy/` → `/var/www/dongboge/deploy/` (部署脚本)

但是没有传输项目根目录下的配置文件。

## 解决方案

### 1. 添加根文件传输步骤

在部署脚本中添加了专门的根文件传输步骤：

```yaml
- name: 完整部署 - 传输项目根文件
  uses: burnett01/rsync-deployments@6.0.0
  with:
    switches: -rltz --rsync-path="rsync"
    path: package.json
    remote_path: /var/www/dongboge/package.json
```

### 2. 创建文件修复脚本

创建了 `deploy/fix-missing-files.sh` 脚本，用于：

- 检测缺失的关键文件
- 从备份恢复文件（如果存在）
- 创建基本的配置文件（如果无法恢复）

### 3. 集成到部署流程

在所有部署脚本中添加了文件修复步骤：

```bash
# 运行文件修复脚本（如果需要）
if [ -f "deploy/fix-missing-files.sh" ]; then
  echo "🔧 运行文件修复脚本..."
  chmod +x deploy/fix-missing-files.sh
  ./deploy/fix-missing-files.sh
fi
```

## 修复的文件

### 1. 部署配置文件

- ✅ `.github/workflows/deploy.yml` - 添加根文件传输和修复步骤
- ✅ `.github/workflows/complete-deploy.yml` - 添加文件修复步骤

### 2. 修复脚本

- ✅ `deploy/fix-missing-files.sh` - 文件修复脚本

## 预期的文件结构

修复后，服务器上应该有以下文件结构：

```
/var/www/dongboge/
├── client/              # 客户端静态文件
│   ├── assets/
│   ├── fonts/
│   └── images/
├── server/              # 服务端文件
│   └── entry.mjs
├── deploy/              # 部署脚本
│   ├── start-service-with-pm2.sh
│   ├── deploy-nginx-config.sh
│   ├── nginx-working.conf
│   └── fix-missing-files.sh
├── package.json         # ✅ 新增
├── package-lock.json    # ✅ 新增 (如果存在)
├── .env                 # ✅ 新增
├── logs/                # PM2日志目录
└── backup/              # 备份目录
```

## 立即修复方法

如果当前部署仍然失败，可以手动运行修复：

### 方法1: 重新部署

推送代码触发新的部署，现在会自动修复文件结构。

### 方法2: 手动上传文件

在服务器上手动创建缺失的文件：

```bash
cd /var/www/dongboge

# 创建基本的package.json
cat > package.json << 'EOF'
{
  "name": "dongboge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/entry.mjs"
  },
  "dependencies": {}
}
EOF

# 创建.env文件
cat > .env << 'EOF'
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF

# 安装依赖
npm install --production

# 启动服务
chmod +x deploy/start-service-with-pm2.sh
./deploy/start-service-with-pm2.sh
```

### 方法3: 使用修复脚本

如果修复脚本已经上传：

```bash
cd /var/www/dongboge
chmod +x deploy/fix-missing-files.sh
./deploy/fix-missing-files.sh
```

## 验证修复

部署完成后，检查文件是否正确：

```bash
cd /var/www/dongboge
echo "package.json: $([ -f package.json ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "server/entry.mjs: $([ -f server/entry.mjs ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "client目录: $([ -d client ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "deploy目录: $([ -d deploy ] && echo '✅ 存在' || echo '❌ 缺失')"
```

## 预防措施

为了避免类似问题：

1. **完整的文件传输**: 确保所有必要文件都被传输
2. **备份机制**: 定期备份重要配置文件
3. **验证步骤**: 部署后验证文件结构完整性
4. **修复脚本**: 保持修复脚本可用

现在的部署脚本应该能够自动处理文件缺失问题，确保服务正常启动。
