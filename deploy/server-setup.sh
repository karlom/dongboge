#!/bin/bash

# 腾讯云服务器环境配置脚本
# 使用方法: chmod +x server-setup.sh && ./server-setup.sh

set -e

echo "🚀 开始配置腾讯云服务器环境..."

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装必要软件
echo "🔧 安装必要软件..."
sudo apt install -y curl wget git nginx ufw

# 安装Node.js 18
echo "📦 安装Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
echo "✅ 验证安装版本:"
node --version
npm --version
nginx -v

# 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 创建网站目录
echo "📁 创建网站目录..."
sudo mkdir -p /var/www/dongboge
sudo chown -R $USER:$USER /var/www/dongboge
sudo chmod -R 755 /var/www

# 创建SSL证书目录
sudo mkdir -p /etc/nginx/ssl

# 配置Git（如果需要）
echo "🔧 配置Git用户信息..."
read -p "请输入你的Git用户名: " git_username
read -p "请输入你的Git邮箱: " git_email
git config --global user.name "$git_username"
git config --global user.email "$git_email"

# 生成SSH密钥（用于GitHub Actions）
echo "🔑 生成SSH密钥..."
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -C "$git_email" -f ~/.ssh/id_rsa -N ""
    echo "✅ SSH密钥已生成，公钥内容："
    cat ~/.ssh/id_rsa.pub
    echo ""
    echo "请将上面的公钥添加到你的GitHub仓库的Deploy Keys中"
else
    echo "SSH密钥已存在"
fi

# 克隆仓库
echo "📥 克隆GitHub仓库..."
read -p "请输入你的GitHub仓库URL (例: git@github.com:username/repo.git): " repo_url
cd /var/www/dongboge
git clone $repo_url .

# 安装依赖并构建
echo "📦 安装项目依赖..."
npm install

echo "🏗️ 构建项目..."
npm run build

# 配置Nginx
echo "🌐 配置Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/dongboge
sudo ln -sf /etc/nginx/sites-available/dongboge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
sudo nginx -t

# 启动服务
echo "🚀 启动服务..."
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "✅ 服务器环境配置完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 申请SSL证书并放置到 /etc/nginx/ssl/ 目录"
echo "2. 在GitHub仓库设置中添加以下Secrets:"
echo "   - HOST: 你的服务器IP地址"
echo "   - USERNAME: 服务器用户名"
echo "   - PRIVATE_KEY: 服务器私钥内容 (cat ~/.ssh/id_rsa)"
echo "   - PORT: SSH端口 (通常是22)"
echo "3. 配置域名DNS解析指向服务器IP"
echo "4. 推送代码到GitHub触发自动部署"