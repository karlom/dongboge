#!/bin/bash

# 检查远程服务器上的目录结构
# 使用方法: ./pre-deploy-check.sh 用户名 服务器地址

if [ $# -lt 2 ]; then
  echo "使用方法: $0 用户名 服务器地址"
  exit 1
fi

USER=$1
SERVER=$2
BASE_DIR="/var/www/***/server"

echo "检查远程服务器目录结构..."

# 检查基本目录是否存在
ssh $USER@$SERVER "if [ ! -d $BASE_DIR ]; then echo '错误: $BASE_DIR 不存在'; exit 1; fi"

# 检查pages目录及其子目录
DIRS=(
  "$BASE_DIR/pages"
  "$BASE_DIR/pages/admin"
  "$BASE_DIR/pages/api"
  "$BASE_DIR/pages/blog"
)

for DIR in "${DIRS[@]}"; do
  echo "检查 $DIR..."
  ssh $USER@$SERVER "if [ ! -d $DIR ]; then echo '警告: $DIR 不存在，将在部署前创建'; fi"
done

echo "检查完成。如果发现缺少目录，请在部署前运行 fix-rsync-directories.sh 脚本"