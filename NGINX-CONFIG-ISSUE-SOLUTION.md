# Nginx配置未更新问题解决方案

## 问题描述

部署后服务器上的Nginx配置中的网站根目录仍然是 `/var/www/dongboge`，而不是期望的 `/var/www/dongboge/client`。

## 问题原因分析

经过检查发现主要原因是：**部署脚本中没有调用Nginx配置更新脚本**

### 具体原因

1. **脚本未被调用**: 当前的 `deploy.yml` 和 `complete-deploy.yml` 中没有调用 `deploy-nginx-config.sh` 脚本
2. **配置文件可能未传输**: 如果使用rsync传输被注释掉，`nginx-working.conf` 可能没有传输到服务器
3. **权限问题**: 脚本可能没有足够权限更新Nginx配置

## 解决方案

### 1. 已更新部署脚本

我已经在以下文件中添加了Nginx配置更新步骤：

#### `.github/workflows/deploy.yml`

- 在完整部署的服务启动测试后添加Nginx配置更新
- 在增量部署的服务重启后添加Nginx配置更新

#### `.github/workflows/complete-deploy.yml`

- 在服务启动测试后添加Nginx配置更新

### 2. 添加的配置更新逻辑

```bash
# 更新Nginx配置
echo "🔧 更新Nginx配置..."
if [ -f "deploy/deploy-nginx-config.sh" ]; then
  chmod +x deploy/deploy-nginx-config.sh
  ./deploy/deploy-nginx-config.sh

  # 重载Nginx
  echo "🔄 重载Nginx..."
  sudo systemctl reload nginx
  echo "✅ Nginx配置更新完成"
else
  echo "⚠️ Nginx配置脚本不存在，跳过配置更新"
fi
```

### 3. 创建调试脚本

创建了 `deploy/debug-nginx-config.sh` 脚本，用于检查服务器上的配置状态。

## 立即解决方法

### 方法1: 手动运行配置更新脚本

在服务器上执行：

```bash
cd /var/www/dongboge

# 检查配置文件是否存在
ls -la deploy/nginx-working.conf

# 如果存在，运行配置更新脚本
sudo ./deploy/deploy-nginx-config.sh

# 或者直接复制配置文件
sudo cp deploy/nginx-working.conf /etc/nginx/sites-available/dongboge.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 方法2: 使用调试脚本检查状态

```bash
cd /var/www/dongboge
chmod +x deploy/debug-nginx-config.sh
./deploy/debug-nginx-config.sh
```

### 方法3: 手动创建正确的配置

如果配置文件不存在，可以手动创建：

```bash
sudo tee /etc/nginx/sites-available/dongboge.conf > /dev/null << 'EOF'
# 修复路由问题的Nginx配置
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
    root /var/www/dongboge/client;
    index index.html;

    # 基本安全头
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # 基本Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
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
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 管理后台
    location ^~ /admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 联系表单页面（精确匹配）
    location = /contact {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }

    # 静态资源文件（高优先级）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
        access_log off;
    }

    # 静态HTML页面和其他内容
    location / {
        # 首先尝试静态文件
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

# 测试并重载配置
sudo nginx -t && sudo systemctl reload nginx
```

## 验证配置是否生效

```bash
# 检查配置文件中的root指令
grep "root " /etc/nginx/sites-available/dongboge.conf

# 应该显示: root /var/www/dongboge/client;

# 测试网站访问
curl -I https://dongboge.cn/
```

## 预防措施

1. **确保文件传输**: 取消注释rsync传输步骤，确保配置文件被传输到服务器
2. **添加验证步骤**: 在部署后验证Nginx配置是否正确更新
3. **监控配置变更**: 定期检查服务器配置是否与预期一致

## 下次部署

现在部署脚本已经更新，下次部署时会自动：

1. 调用Nginx配置更新脚本
2. 使用正确的配置文件（nginx-working.conf）
3. 重载Nginx服务
4. 验证配置是否生效

这样应该能解决配置未更新的问题。
