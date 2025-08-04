#!/bin/bash

# 强制修复Nginx配置问题

echo "🔧 强制修复Nginx配置..."

cd /var/www/dongboge

echo "1. 备份当前Nginx配置..."
sudo cp /etc/nginx/sites-available/dongboge.conf /etc/nginx/sites-available/dongboge.conf.backup.$(date +%Y%m%d-%H%M%S)

echo "2. 创建修复的Nginx配置..."
sudo tee /etc/nginx/sites-available/dongboge.conf > /dev/null << 'EOF'
# 修复版Nginx配置 - 支持Astro服务器模式
server {
    listen 80;
    server_name dongboge.cn www.dongboge.cn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dongboge.cn www.dongboge.cn;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/dongboge.cn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dongboge.cn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # 网站根目录
    root /var/www/dongboge;
    index index.html;

    # 基本安全头
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # 基本Gzip压缩（修复语法错误）
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 动态页面路由（优先级最高）
    # API端点
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 管理后台
    location ^~ /admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 联系表单页面（精确匹配，最高优先级）
    location = /contact {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源文件
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
        access_log off;
    }

    # 静态HTML页面和其他内容
    location / {
        try_files $uri $uri/ $uri.html =404;
        
        # 缓存静态HTML文件
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public";
        }
    }

    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /var/www/dongboge;
    }
}
EOF

echo "3. 测试新的Nginx配置..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ 新配置测试失败，恢复备份..."
    sudo cp /etc/nginx/sites-available/dongboge.conf.backup.* /etc/nginx/sites-available/dongboge.conf
    exit 1
fi

echo "4. 启用新配置..."
sudo ln -sf /etc/nginx/sites-available/dongboge.conf /etc/nginx/sites-enabled/dongboge.conf

echo "5. 停止旧的Node.js进程..."
pkill -f "node.*server/entry.mjs" || echo "没有运行的进程"

echo "6. 检查服务器文件..."
if [ ! -f "server/entry.mjs" ]; then
    echo "❌ 服务器入口文件不存在"
    ls -la server/ || echo "server目录不存在"
    exit 1
fi

echo "7. 设置环境变量..."
cat > .env << EOF
PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL:-}
PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY:-}
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF

echo "8. 启动Node.js服务器..."
nohup node server/entry.mjs > server.log 2>&1 &
sleep 5

echo "9. 检查服务器启动状态..."
if ps aux | grep "node.*server/entry.mjs" | grep -v grep > /dev/null; then
    echo "✅ Node.js服务器启动成功"
    
    # 测试本地服务器响应
    echo "10. 测试本地服务器响应..."
    sleep 2
    LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/contact)
    echo "本地服务器响应: $LOCAL_RESPONSE"
    
    if [ "$LOCAL_RESPONSE" = "200" ]; then
        echo "✅ Node.js服务器响应正常"
    else
        echo "⚠️ Node.js服务器响应异常"
        echo "服务器日志:"
        tail -20 server.log
    fi
else
    echo "❌ Node.js服务器启动失败"
    echo "错误日志:"
    tail -20 server.log
    exit 1
fi

echo "11. 重载Nginx..."
sudo systemctl reload nginx

echo "✅ 强制修复完成！"

echo ""
echo "🧪 测试结果:"
sleep 3
echo "首页状态: $(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/ 2>/dev/null || echo 'ERROR')"
echo "Contact页面状态: $(curl -s -o /dev/null -w "%{http_code}" https://dongboge.cn/contact 2>/dev/null || echo 'ERROR')"

echo ""
echo "🔍 当前进程状态:"
ps aux | grep "node.*server/entry.mjs" | grep -v grep || echo "没有找到Node.js进程"

echo ""
echo "📝 Nginx配置已更新，备份文件:"
ls -la /etc/nginx/sites-available/dongboge.conf.backup.*