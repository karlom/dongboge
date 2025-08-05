# 部署问题修复总结

## 问题1: Node.js模块找不到 (ERR_MODULE_NOT_FOUND)

### 问题原因

服务器上缺少Node.js依赖包，导致`server/entry.mjs`无法找到所需的模块。

### 解决方案

在所有部署脚本中添加了依赖安装步骤：

```bash
# 安装Node.js依赖
echo "📦 安装生产依赖..."
if [ -f "package.json" ]; then
  npm install --production --silent >/dev/null 2>&1
  echo "✅ 依赖安装完成"
else
  echo "❌ package.json不存在，无法安装依赖"
  exit 1
fi
```

### 修复的文件

- ✅ `.github/workflows/deploy.yml` - 完整部署和增量部署
- ✅ `.github/workflows/complete-deploy.yml` - 完整部署

## 问题2: Nginx配置没有更新到正确的根目录

### 问题原因

Nginx配置更新脚本执行失败或没有正确验证配置更新结果。

### 解决方案

1. **增强错误处理**: 添加了详细的错误检查和日志输出
2. **配置验证**: 部署后自动验证Nginx根目录配置
3. **失败处理**: 配置更新失败时立即退出部署

```bash
# 更新Nginx配置
if ./deploy/deploy-nginx-config.sh; then
  # 重载Nginx
  if sudo systemctl reload nginx; then
    # 验证配置是否正确
    ROOT_DIR=$(grep -E "^\s*root\s+" /etc/nginx/sites-available/dongboge.conf | head -1 | awk '{print $2}' | sed 's/;//')
    echo "📁 当前Nginx根目录: $ROOT_DIR"

    if [ "$ROOT_DIR" = "/var/www/dongboge/client" ]; then
      echo "✅ Nginx根目录配置正确"
    else
      echo "⚠️ Nginx根目录配置可能不正确"
    fi
  else
    echo "❌ Nginx重载失败"
    exit 1
  fi
else
  echo "❌ Nginx配置更新失败"
  exit 1
fi
```

## 问题3: package.json内容不完整

### 问题原因

自动生成的package.json缺少必要的依赖信息。

### 解决方案

改进了文件修复脚本，创建包含基本依赖的package.json：

```json
{
  "name": "dongboge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/entry.mjs",
    "dev": "node server/entry.mjs"
  },
  "dependencies": {
    "@astrojs/node": "^8.0.0",
    "astro": "^4.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## 修复后的部署流程

### 完整部署流程

1. **文件验证** - 检查关键文件是否存在
2. **文件修复** - 运行修复脚本补充缺失文件
3. **依赖安装** - 安装Node.js生产依赖
4. **环境配置** - 创建.env文件
5. **服务启动** - 使用PM2启动Node.js服务
6. **Nginx配置** - 更新并验证Nginx配置
7. **配置验证** - 验证所有配置是否正确

### 增量部署流程

1. **文件验证** - 检查关键文件
2. **文件修复** - 补充缺失文件
3. **依赖安装** - 更新依赖
4. **环境配置** - 确保.env文件存在
5. **服务重启** - 重启PM2服务
6. **Nginx配置** - 更新Nginx配置
7. **配置验证** - 验证配置正确性

## 预期结果

修复后的部署应该能够：

### ✅ 服务启动

- Node.js服务正常启动在3000端口
- PM2进程状态为"online"
- 端口3000正在监听
- 服务响应HTTP 200

### ✅ Nginx配置

- 根目录正确设置为`/var/www/dongboge/client`
- 动态路由正确代理到3000端口
- 静态文件正确提供
- SSL和重定向正常工作

### ✅ 文件结构

```
/var/www/dongboge/
├── client/              # 静态文件 (Nginx根目录)
├── server/              # Node.js服务文件
│   └── entry.mjs
├── deploy/              # 部署脚本
├── package.json         # Node.js项目配置
├── .env                 # 环境变量
├── node_modules/        # 依赖包
└── logs/                # PM2日志
```

## 验证步骤

部署完成后，检查以下内容：

### 1. 服务状态

```bash
# 检查PM2进程
pm2 list

# 检查端口监听
netstat -tlnp | grep :3000

# 测试服务响应
curl -I http://127.0.0.1:3000/
```

### 2. Nginx配置

```bash
# 检查配置文件
grep "root " /etc/nginx/sites-available/dongboge.conf

# 测试配置
sudo nginx -t

# 测试网站访问
curl -I https://dongboge.cn/
```

### 3. 文件结构

```bash
cd /var/www/dongboge
ls -la
echo "package.json: $([ -f package.json ] && echo '✅' || echo '❌')"
echo "node_modules: $([ -d node_modules ] && echo '✅' || echo '❌')"
```

## 故障排除

如果部署仍然失败：

### 1. 检查依赖安装

```bash
cd /var/www/dongboge
npm list --depth=0
```

### 2. 检查服务日志

```bash
pm2 logs dongboge
# 或
tail -f logs/server.log
```

### 3. 手动修复

```bash
cd /var/www/dongboge
chmod +x deploy/fix-missing-files.sh
./deploy/fix-missing-files.sh
npm install --production
chmod +x deploy/start-service-with-pm2.sh
./deploy/start-service-with-pm2.sh
```

现在的部署脚本应该能够自动解决Node.js依赖和Nginx配置问题，确保服务正常启动。
