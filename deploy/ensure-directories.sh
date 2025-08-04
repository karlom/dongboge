#!/bin/bash

# 在部署前确保所有必要的目录都存在
# 使用方法: ./ensure-directories.sh 用户名 服务器地址

if [ $# -lt 2 ]; then
  echo "使用方法: $0 用户名 服务器地址"
  exit 1
fi

USER=$1
SERVER=$2
BASE_DIR="/var/www/***/server"

echo "在远程服务器上创建必要的目录结构..."

# 创建所有必要的目录
ssh $USER@$SERVER "mkdir -p $BASE_DIR/pages $BASE_DIR/pages/admin $BASE_DIR/pages/api $BASE_DIR/pages/blog && echo '目录结构已创建'"

# 设置正确的权限
ssh $USER@$SERVER "sudo chown -R www-data:www-data $BASE_DIR && sudo chmod -R 755 $BASE_DIR && echo '权限已设置'"

echo "目录准备完成，现在可以安全部署了"