#!/bin/bash

# 确保脚本以 root 或具有足够权限的用户运行
if [ "$(id -u)" -ne 0 ]; then
   echo "此脚本需要 root 权限，请使用 sudo 运行" 
   exit 1
fi

# 设置基本目录路径（根据您的实际路径修改）
BASE_DIR="/var/www/***/server"

# 创建所需的目录结构
mkdir -p "$BASE_DIR/pages"
mkdir -p "$BASE_DIR/pages/admin"
mkdir -p "$BASE_DIR/pages/api"
mkdir -p "$BASE_DIR/pages/blog"

# 设置正确的权限
chown -R www-data:www-data "$BASE_DIR"
chmod -R 755 "$BASE_DIR"

echo "目录结构已创建，权限已设置"
echo "现在可以重新运行部署命令了"