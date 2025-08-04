#!/bin/bash
# 修复部署脚本 - 解决rsync错误和进程管理问题

# 使用方法: ./fix-deployment.sh 用户名 服务器地址

if [ $# -lt 2 ]; then
  echo "使用方法: $0 用户名 服务器地址"
  exit 1
fi

USER=$1
SERVER=$2
BASE_DIR="/var/www/***"

echo "===== 开始修复部署问题 ====="

# 1. 确保服务器上的目录结构完整
echo "1. 创建必要的目录结构..."
ssh $USER@$SERVER "mkdir -p $BASE_DIR/server/pages $BASE_DIR/server/pages/admin $BASE_DIR/server/pages/api $BASE_DIR/server/pages/blog"

# 2. 设置正确的权限
echo "2. 设置目录权限..."
ssh $USER@$SERVER "sudo chown -R $USER:$USER $BASE_DIR && chmod -R 755 $BASE_DIR"

# 3. 检查并修复进程管理问题
echo "3. 检查Node.js进程状态..."
ssh $USER@$SERVER "
  echo '当前运行的Node.js进程:';
  ps aux | grep 'node.*server/entry.mjs' | grep -v grep;
  
  echo '安全停止进程...';
  for pid in \$(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | awk '{print \$2}'); do
    echo \"正在停止进程 \$pid\";
    kill -15 \$pid;
    sleep 2;
    if ps -p \$pid > /dev/null; then
      echo \"进程 \$pid 未响应SIGTERM，使用SIGKILL\";
      kill -9 \$pid;
    fi;
  done;
  
  echo '确认所有进程已停止:';
  ps aux | grep 'node.*server/entry.mjs' | grep -v grep || echo '没有运行的进程';
"

# 4. 创建一个改进的部署脚本
echo "4. 创建改进的部署脚本..."
cat > improved-deploy.sh << 'EOF'
#!/bin/bash
# 改进的部署脚本 - 解决rsync错误和进程管理问题

set -e

BASE_DIR="/var/www/***"
cd $BASE_DIR

echo "🔍 验证部署文件..."
echo "=== 当前目录内容 ==="
ls -la
echo ""

echo "=== 检查关键文件 ==="
echo "package.json: $([ -f package.json ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "server/entry.mjs: $([ -f server/entry.mjs ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "client目录: $([ -d client ] && echo '✅ 存在' || echo '❌ 缺失')"

if [ ! -f package.json ]; then
  echo "❌ package.json 缺失，部署失败"
  exit 1
fi

echo "📦 安装生产依赖..."
npm install --production --silent

echo "🔧 更新Nginx配置..."
if [ -f "deploy/nginx-fixed-routing.conf" ]; then
  sudo cp deploy/nginx-fixed-routing.conf /etc/nginx/sites-available/***.conf
  sudo ln -sf /etc/nginx/sites-available/***.conf /etc/nginx/sites-enabled/***.conf
  echo "✅ Nginx配置已更新"
else
  echo "⚠️ 使用现有Nginx配置"
fi

echo "🧪 测试Nginx配置..."
sudo nginx -t

echo "🔄 设置环境变量..."
cat > .env << 'ENVEOF'
PUBLIC_SUPABASE_URL=***
PUBLIC_SUPABASE_ANON_KEY=***
PUBLIC_CDN_URL=***
SITE_URL=https://***.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
ENVEOF

echo "🛑 安全停止旧的Node.js进程..."
for pid in $(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | awk '{print $2}'); do
  echo "正在停止进程 $pid"
  kill -15 $pid 2>/dev/null || echo "进程 $pid 不存在"
  sleep 2
  if ps -p $pid > /dev/null 2>&1; then
    echo "进程 $pid 未响应SIGTERM，使用SIGKILL"
    kill -9 $pid 2>/dev/null || echo "进程 $pid 已终止"
  fi
done

# 确保所有进程已停止
sleep 1
if ps aux | grep 'node.*server/entry.mjs' | grep -v grep > /dev/null; then
  echo "⚠️ 仍有Node.js进程运行，强制终止..."
  pkill -9 -f "node.*server/entry.mjs" || echo "没有运行的进程"
  sleep 1
fi

echo "🚀 启动Node.js服务器..."
mkdir -p logs
nohup node server/entry.mjs > logs/server.log 2>&1 &

echo "⏳ 等待服务器启动..."
sleep 5

echo "🔍 检查服务器状态..."
if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
  echo "✅ Node.js服务器启动成功"
  
  # 测试本地响应
  echo "🧪 测试本地服务器响应..."
  LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "ERROR")
  echo "本地响应: $LOCAL_RESPONSE"
  
  if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo "✅ 本地服务器响应正常"
  else
    echo "⚠️ 本地服务器响应异常，查看日志:"
    tail -20 logs/server.log
  fi
else
  echo "❌ Node.js服务器启动失败"
  echo "错误日志:"
  tail -20 logs/server.log
  exit 1
fi

echo "🔄 重载Nginx..."
sudo systemctl reload nginx

echo "✅ 部署完成！"

echo ""
echo "🧪 最终测试..."
sleep 3
EXTERNAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://***.cn/ 2>/dev/null || echo "ERROR")
echo "外部访问响应: $EXTERNAL_RESPONSE"

echo ""
echo "📊 部署状态总结:"
echo "Node.js进程: $(ps aux | grep 'node.*server/entry.mjs' | grep -v grep | wc -l) 个"
echo "端口3000监听: $(netstat -tlnp 2>/dev/null | grep :3000 | wc -l) 个"
echo "首页状态: $(curl -s -o /dev/null -w "%{http_code}" https://***.cn/ 2>/dev/null || echo 'ERROR')"
echo "Contact页面: $(curl -s -o /dev/null -w "%{http_code}" https://***.cn/contact 2>/dev/null || echo 'ERROR')"
EOF

# 5. 上传改进的部署脚本到服务器
echo "5. 上传改进的部署脚本到服务器..."
scp improved-deploy.sh $USER@$SERVER:$BASE_DIR/deploy/improved-deploy.sh
ssh $USER@$SERVER "chmod +x $BASE_DIR/deploy/improved-deploy.sh"

# 6. 创建rsync修复脚本
echo "6. 创建rsync修复脚本..."
cat > fix-rsync.sh << 'EOF'
#!/bin/bash
# 修复rsync错误的脚本

SOURCE=$1
USER=$2
SERVER=$3
DEST=$4

if [ $# -lt 4 ]; then
  echo "使用方法: $0 源目录 用户名 服务器地址 目标目录"
  exit 1
fi

echo "准备rsync传输..."
echo "1. 确保目标目录存在"
ssh $USER@$SERVER "mkdir -p $DEST/server/pages $DEST/server/pages/admin $DEST/server/pages/api $DEST/server/pages/blog"

echo "2. 设置正确的权限"
ssh $USER@$SERVER "sudo chown -R $USER:$USER $DEST"

echo "3. 执行rsync传输"
rsync -avz --delete --rsync-path="mkdir -p $DEST && rsync" "$SOURCE/" "$USER@$SERVER:$DEST/"

echo "4. 验证传输结果"
ssh $USER@$SERVER "ls -la $DEST/server/pages/"

echo "传输完成"
EOF

chmod +x fix-rsync.sh

echo "===== 修复脚本创建完成 ====="
echo ""
echo "使用方法:"
echo "1. 修复服务器目录结构: ./deploy/fix-deployment.sh 用户名 服务器地址"
echo "2. 安全rsync传输: ./fix-rsync.sh 本地源目录 用户名 服务器地址 /var/www/***"
echo "3. 在服务器上运行改进的部署脚本: ssh 用户名@服务器地址 '/var/www/***/deploy/improved-deploy.sh'"
echo ""
echo "这些脚本将解决rsync错误和进程管理问题"