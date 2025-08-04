#!/bin/bash

# SSL证书配置脚本 - 使用Let's Encrypt免费证书
# 使用方法: chmod +x ssl-setup.sh && ./ssl-setup.sh

set -e

echo "🔒 开始配置SSL证书..."

# 安装Certbot
echo "📦 安装Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
echo "🔑 获取SSL证书..."
echo "请确保域名已经解析到此服务器IP"
read -p "按回车键继续..."

sudo certbot --nginx -d dongboge.cn -d www.dongboge.cn

# 设置自动续期
echo "⏰ 设置证书自动续期..."
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

# 重启Nginx
sudo systemctl reload nginx

echo "✅ SSL证书配置完成！"
echo "🌐 现在可以通过 https://www.dongboge.cn 访问你的网站"