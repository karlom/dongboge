# 部署逻辑更新总结

## 问题背景

用户使用 `trae` 帮助编写了一个能够正常启动3000端口的脚本 `deploy/verify-pm2-service.sh`，该脚本基于 `deploy.yml` 中的逻辑演化而来，说明原部署脚本的逻辑存在问题。

## 分析发现的问题

通过对比工作脚本 `verify-pm2-service.sh` 和原部署脚本，发现以下关键差异：

### 1. 环境变量处理不完善

- **原问题**: 部署脚本中环境变量设置不够完整，没有从 `.env` 文件正确读取配置
- **解决方案**: 添加从 `.env` 文件读取 `PORT` 和 `HOST` 配置的逻辑

### 2. 进程清理不彻底

- **原问题**: 没有彻底停止现有的 PM2 服务和 Node.js 进程
- **解决方案**: 添加完整的进程清理逻辑，包括 PM2 服务停止和所有相关 Node.js 进程的终止

### 3. 端口释放机制缺失

- **原问题**: 没有检查和释放被占用的端口
- **解决方案**: 添加端口占用检查和强制释放逻辑

### 4. PM2 启动方式不正确

- **原问题**: PM2 启动时没有正确传递环境变量
- **解决方案**: 使用 `PORT="$PORT" HOST="$HOST" pm2 start` 的方式启动服务

### 5. 验证流程不完整

- **原问题**: 缺少完整的服务启动验证流程
- **解决方案**: 添加 PM2 状态检查、端口监听检查和 HTTP 响应测试

## 更新内容

### 1. 创建专用启动脚本

创建了 `deploy/start-service-with-pm2.sh` 脚本，基于工作的 `verify-pm2-service.sh` 逻辑：

- 完整的环境变量处理
- 彻底的进程清理
- 端口释放机制
- 正确的 PM2 启动方式
- 完整的验证流程

### 2. 更新部署配置文件

更新了以下文件中的服务启动逻辑：

- `.github/workflows/deploy.yml` - 完整部署和增量部署
- `.github/workflows/complete-deploy.yml` - 完整部署

### 3. 统一启动逻辑

所有部署脚本现在都调用统一的 `deploy/start-service-with-pm2.sh` 脚本，确保：

- 逻辑一致性
- 维护简便性
- 问题排查容易

## 关键改进点

### 1. 环境变量处理

```bash
# 从.env文件读取配置
PORT=$(grep -E "^PORT=" .env | cut -d= -f2)
HOST=$(grep -E "^HOST=" .env | cut -d= -f2)

# 设置默认值
if [ -z "$PORT" ]; then PORT=3000; fi
if [ -z "$HOST" ]; then HOST="127.0.0.1"; fi
```

### 2. 彻底的进程清理

```bash
# 停止PM2服务
pm2 stop dongboge && pm2 delete dongboge

# 停止所有相关Node.js进程
for pid in $(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | awk '{print $2}'); do
    kill -15 $pid || kill -9 $pid
done
```

### 3. 端口释放

```bash
# 检查并释放端口
if netstat -tlnp | grep ":$PORT"; then
    for pid in $(netstat -tlnp | grep ":$PORT" | awk '{print $7}' | cut -d/ -f1); do
        kill -15 $pid || kill -9 $pid
    done
fi
```

### 4. 正确的PM2启动

```bash
# 使用环境变量方式启动PM2
PORT="$PORT" HOST="$HOST" pm2 start server/entry.mjs --name dongboge \
    --log logs/server.log --error logs/error.log --output logs/out.log
```

### 5. 完整验证

```bash
# 检查PM2状态
pm2 list | grep "dongboge" | grep "online"

# 检查端口监听
netstat -tlnp | grep ":$PORT"

# 测试HTTP响应
curl -s -o /dev/null -w "%{http_code}" "http://$HOST:$PORT/"
```

## 预期效果

通过这些更新，部署脚本现在应该能够：

1. 正确启动服务在3000端口
2. 彻底清理旧的进程和服务
3. 正确处理环境变量
4. 提供完整的启动验证
5. 在出现问题时提供详细的日志信息

## 使用方法

### 自动部署

推送代码到 `main` 分支时，GitHub Actions 会自动使用更新后的部署逻辑。

### 手动部署

可以直接在服务器上运行：

```bash
cd /var/www/dongboge
chmod +x deploy/start-service-with-pm2.sh
./deploy/start-service-with-pm2.sh
```

## 注意事项

1. 确保服务器上已安装 PM2
2. 确保 `.env` 文件存在且包含正确的配置
3. 确保 `server/entry.mjs` 文件存在
4. 如果遇到权限问题，可能需要调整文件权限

这次更新基于实际工作的脚本逻辑，应该能够解决之前部署时服务无法正常启动的问题。
