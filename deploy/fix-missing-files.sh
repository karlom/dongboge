#!/bin/bash

# 修复缺失文件的脚本
# 用于手动上传缺失的根目录文件

echo "🔧 修复缺失的文件..."

# 检查当前目录
echo "📁 当前目录: $(pwd)"
echo "📂 目录内容:"
ls -la

# 检查是否缺少关键文件
MISSING_FILES=()

if [ ! -f "package.json" ]; then
    echo "❌ 缺少 package.json"
    MISSING_FILES+=("package.json")
fi

if [ ! -f "package-lock.json" ]; then
    echo "⚠️  缺少 package-lock.json"
    MISSING_FILES+=("package-lock.json")
fi

if [ ! -f ".env" ]; then
    echo "⚠️  缺少 .env 文件"
    MISSING_FILES+=(".env")
fi

# 如果有缺失文件，尝试从备份恢复或创建
if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "🔍 尝试从备份恢复文件..."
    
    # 检查备份目录
    if [ -d "backup" ]; then
        LATEST_BACKUP=$(ls -t backup/backup-*.tar.gz 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            echo "📦 找到备份文件: $LATEST_BACKUP"
            echo "🔄 从备份恢复文件..."
            
            # 解压备份到临时目录
            mkdir -p temp_restore
            tar -xzf "$LATEST_BACKUP" -C temp_restore 2>/dev/null || true
            
            # 恢复缺失的文件
            for file in "${MISSING_FILES[@]}"; do
                if [ -f "temp_restore/dongboge/$file" ]; then
                    cp "temp_restore/dongboge/$file" .
                    echo "✅ 恢复了 $file"
                elif [ -f "temp_restore/$file" ]; then
                    cp "temp_restore/$file" .
                    echo "✅ 恢复了 $file"
                fi
            done
            
            # 清理临时目录
            rm -rf temp_restore
        fi
    fi
    
    # 如果仍然缺少package.json，创建一个基本的
    if [ ! -f "package.json" ]; then
        echo "📝 创建基本的 package.json..."
        cat > package.json << 'EOF'
{
  "name": "dongboge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/entry.mjs",
    "dev": "node server/entry.mjs"
  },
  "dependencies": {
    "@astrojs/node": "^8.0.0",
    "astro": "^4.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
        echo "✅ 创建了基本的 package.json"
    fi
    
    # 如果缺少.env文件，创建一个
    if [ ! -f ".env" ]; then
        echo "📝 创建 .env 文件..."
        cat > .env << 'EOF'
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_CDN_URL=https://cdn.dongboge.cn
SITE_URL=https://dongboge.cn
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
EOF
        echo "✅ 创建了 .env 文件"
    fi
fi

# 验证文件结构
echo ""
echo "📋 验证修复后的文件结构:"
echo "package.json: $([ -f package.json ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "server/entry.mjs: $([ -f server/entry.mjs ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "client目录: $([ -d client ] && echo '✅ 存在' || echo '❌ 缺失')"
echo "deploy目录: $([ -d deploy ] && echo '✅ 存在' || echo '❌ 缺失')"
echo ".env文件: $([ -f .env ] && echo '✅ 存在' || echo '❌ 缺失')"

# 检查目录权限
echo ""
echo "🔐 检查目录权限:"
ls -la | head -10

echo ""
echo "✅ 文件修复完成！"