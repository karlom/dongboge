# 服务器手动修复命令

如果GitHub Actions部署后服务器仍然无响应，请按以下步骤手动修复：

## 1. 登录服务器并进入项目目录
```bash
ssh your-username@your-server
cd /var/www/dongboge
```

## 2. 检查当前状态
```bash
# 检查文件结构
ls -la
ls -la server/

# 检查进程状态
ps aux | grep node
pm2 status 2>/dev/null || echo "PM2未运行"

# 检查端口监听
netstat -tlnp | grep 3000
```

## 3. 一键修复脚本（复制粘贴执行）
```bash
# 创建并执行修复脚本
cat > quick-fix.sh << 'EOF'
#!/bin/bash
echo "🚀 开始修复服务器..."

# 检查关键文件
if [ ! -f "server/entry.mjs" ]; then
    echo "❌ server/entry.mjs 不存在！请检查部署"
    exit 1
fi

# 创建必要目录
mkdir -p logs backup

# 安装PM2
if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 停止现有服务
echo "🛑 停止现有服务..."
pm2 stop dongboge 2>/dev/null || true
pm2 delete dongboge 2>/dev/null || true
pkill -f "node.*server/entry.mjs" 2>/dev/null || true
sleep 2

# 确保依赖已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --production
fi

# 设置环境变量
if [ ! -f ".env" ]; then
    echo "🔧 创建.env文件..."
    cat > .env << ENVEOF
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
ENVEOF
fi

# 启动服务
echo "🚀 启动服务..."
pm2 start server/entry.mjs --name dongboge --log logs/server.log --error logs/error.log --out logs/out.log
pm2 save

# 等待启动
sleep 8

# 检查状态
if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
    echo "✅ 服务启动成功！"
    pm2 status dongboge
    
    # 检查端口
    if netstat -tlnp | grep :3000 > /dev/null; then
        echo "✅ 端口3000正在监听"
        
        # 测试响应
        sleep 3
        LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR")
        echo "本地响应: $LOCAL_RESPONSE"
        
        if [ "$LOCAL_RESPONSE" = "200" ]; then
            echo "🎉 服务完全正常！"
            echo "✅ 本地: http://127.0.0.1:3000"
            echo "✅ 外部: https://dongboge.cn"
        else
            echo "⚠️ 服务启动但响应异常，查看日志："
            tail -10 logs/server.log
        fi
    else
        echo "❌ 端口3000未监听，查看PM2日志："
        pm2 logs dongboge --lines 10
    fi
else
    echo "❌ PM2启动失败，尝试直接启动..."
    pm2 logs dongboge --lines 10
    
    echo "使用nohup直接启动..."
    nohup node server/entry.mjs > logs/server.log 2>&1 &
    sleep 5
    
    if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
        echo "✅ 直接启动成功！"
    else
        echo "❌ 所有启动方法都失败，查看日志："
        tail -20 logs/server.log
        exit 1
    fi
fi

echo "🎯 修复完成！"
EOF

chmod +x quick-fix.sh
./quick-fix.sh
```

## 4. 常用管理命令
```bash
# 查看PM2状态
pm2 status

# 查看服务日志
pm2 logs dongboge

# 重启服务
pm2 restart dongboge

# 停止服务
pm2 stop dongboge

# 查看实时日志
tail -f logs/server.log

# 检查端口监听
netstat -tlnp | grep 3000

# 测试本地响应
curl -I http://127.0.0.1:3000/

# 测试外部响应
curl -I https://dongboge.cn/
```

## 5. 如果仍然有问题

### 检查Nginx配置
```bash
# 测试Nginx配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx

# 查看Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

### 检查防火墙
```bash
# 检查防火墙状态
sudo ufw status

# 如果需要开放3000端口（通常不需要，因为有Nginx代理）
sudo ufw allow 3000
```

### 完全重新部署
如果以上都不行，可以在GitHub Actions中重新运行部署工作流。

## 6. 成功标志

当修复成功时，你应该看到：
- ✅ PM2状态显示dongboge进程运行中
- ✅ 端口3000有进程监听
- ✅ 本地响应返回200状态码
- ✅ 外部访问https://dongboge.cn正常

## 7. 联系支持

如果问题仍然存在，请提供以下信息：
- PM2状态：`pm2 status`
- 服务日志：`tail -20 logs/server.log`
- 系统信息：`uname -a && node --version`