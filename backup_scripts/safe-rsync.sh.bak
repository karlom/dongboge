#!/bin/bash

# 安全的 rsync 部署脚本，确保目录存在
# 使用方法: ./safe-rsync.sh 源目录 用户名 服务器地址 目标目录

if [ $# -lt 4 ]; then
  echo "使用方法: $0 源目录 用户名 服务器地址 目标目录"
  exit 1
fi

SOURCE=$1
USER=$2
SERVER=$3
DEST=$4

# 首先确保目标目录存在
echo "确保目标目录存在..."
ssh $USER@$SERVER "mkdir -p $DEST"

# 执行 rsync，使用 --rsync-path 参数确保目录创建
echo "开始安全 rsync 传输..."
rsync -avz --rsync-path="mkdir -p $DEST && rsync" "$SOURCE" "$USER@$SERVER:$DEST"

echo "传输完成"