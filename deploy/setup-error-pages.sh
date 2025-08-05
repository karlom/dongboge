#!/bin/bash

# 错误页面设置脚本
# 确保404和50x错误页面被正确部署和配置

echo "🔧 设置错误页面..."

# 配置变量
DEPLOY_DIR="/var/www/dongboge"
CLIENT_DIR="$DEPLOY_DIR/client"
ERROR_PAGES_DIR="$CLIENT_DIR"

# 确保在正确的目录
cd "$DEPLOY_DIR" || {
    echo "❌ 无法切换到部署目录: $DEPLOY_DIR"
    exit 1
}

# 检查client目录是否存在
if [ ! -d "$CLIENT_DIR" ]; then
    echo "📁 创建client目录..."
    mkdir -p "$CLIENT_DIR"
fi

# 检查错误页面是否存在
echo "🔍 检查错误页面文件..."

if [ -f "$ERROR_PAGES_DIR/404.html" ]; then
    echo "✅ 404.html 已存在"
else
    echo "⚠️ 404.html 不存在"
    if [ -f "public/404.html" ]; then
        echo "📋 从public目录复制404.html..."
        cp "public/404.html" "$ERROR_PAGES_DIR/404.html"
        echo "✅ 404.html 复制完成"
    else
        echo "❌ 未找到404.html源文件"
    fi
fi

if [ -f "$ERROR_PAGES_DIR/50x.html" ]; then
    echo "✅ 50x.html 已存在"
else
    echo "⚠️ 50x.html 不存在"
    if [ -f "public/50x.html" ]; then
        echo "📋 从public目录复制50x.html..."
        cp "public/50x.html" "$ERROR_PAGES_DIR/50x.html"
        echo "✅ 50x.html 复制完成"
    else
        echo "❌ 未找到50x.html源文件"
    fi
fi

# 设置正确的文件权限
echo "🔐 设置文件权限..."
if [ -f "$ERROR_PAGES_DIR/404.html" ]; then
    chmod 644 "$ERROR_PAGES_DIR/404.html"
    echo "✅ 404.html 权限设置完成"
fi

if [ -f "$ERROR_PAGES_DIR/50x.html" ]; then
    chmod 644 "$ERROR_PAGES_DIR/50x.html"
    echo "✅ 50x.html 权限设置完成"
fi

# 验证Nginx配置中的错误页面设置
echo "🔍 验证Nginx错误页面配置..."
NGINX_CONF="/etc/nginx/sites-available/dongboge.conf"

if [ -f "$NGINX_CONF" ]; then
    if grep -q "error_page.*404" "$NGINX_CONF"; then
        echo "✅ Nginx 404错误页面配置已存在"
    else
        echo "⚠️ Nginx 404错误页面配置缺失"
    fi
    
    if grep -q "error_page.*50" "$NGINX_CONF"; then
        echo "✅ Nginx 50x错误页面配置已存在"
    else
        echo "⚠️ Nginx 50x错误页面配置缺失"
    fi
    
    # 显示当前错误页面配置
    echo "📋 当前Nginx错误页面配置:"
    grep -E "error_page|location.*=.*/404\.html|location.*=.*/50x\.html" "$NGINX_CONF" || echo "未找到错误页面配置"
else
    echo "❌ Nginx配置文件不存在: $NGINX_CONF"
fi

# 测试错误页面是否可访问
echo "🧪 测试错误页面访问..."

if [ -f "$ERROR_PAGES_DIR/404.html" ]; then
    FILE_SIZE=$(stat -f%z "$ERROR_PAGES_DIR/404.html" 2>/dev/null || stat -c%s "$ERROR_PAGES_DIR/404.html" 2>/dev/null)
    echo "📄 404.html 文件大小: ${FILE_SIZE} 字节"
    
    # 检查文件内容是否完整
    if [ "$FILE_SIZE" -gt 1000 ]; then
        echo "✅ 404.html 文件内容完整"
    else
        echo "⚠️ 404.html 文件可能不完整"
    fi
fi

if [ -f "$ERROR_PAGES_DIR/50x.html" ]; then
    FILE_SIZE=$(stat -f%z "$ERROR_PAGES_DIR/50x.html" 2>/dev/null || stat -c%s "$ERROR_PAGES_DIR/50x.html" 2>/dev/null)
    echo "📄 50x.html 文件大小: ${FILE_SIZE} 字节"
    
    # 检查文件内容是否完整
    if [ "$FILE_SIZE" -gt 1000 ]; then
        echo "✅ 50x.html 文件内容完整"
    else
        echo "⚠️ 50x.html 文件可能不完整"
    fi
fi

# 检查Favicon是否存在
echo "🔍 检查Favicon文件..."
FAVICON_PATH="$ERROR_PAGES_DIR/Favicon.png"
if [ -f "$FAVICON_PATH" ]; then
    echo "✅ Favicon.png 存在"
else
    echo "⚠️ Favicon.png 不存在"
    # 尝试从其他位置复制
    for favicon_source in "public/Favicon.png" "Favicon.png" "favicon.png"; do
        if [ -f "$favicon_source" ]; then
            cp "$favicon_source" "$FAVICON_PATH"
            echo "✅ 从 $favicon_source 复制了Favicon"
            break
        fi
    done
fi

# 创建测试用的错误页面链接（可选）
echo "🔗 创建测试链接..."
TEST_DIR="$CLIENT_DIR/test"
if [ ! -d "$TEST_DIR" ]; then
    mkdir -p "$TEST_DIR"
fi

# 创建测试404页面的链接
cat > "$TEST_DIR/test-404.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>404测试页面</title>
    <meta charset="UTF-8">
</head>
<body>
    <h1>404错误页面测试</h1>
    <p>这是一个测试页面，用于验证404错误页面是否正常工作。</p>
    <p><a href="/nonexistent-page">点击这里测试404页面</a></p>
    <p><a href="/">返回首页</a></p>
</body>
</html>
EOF

echo "✅ 创建了测试页面: /test/test-404.html"

# 显示最终状态
echo ""
echo "📊 错误页面设置总结:"
echo "=================================="
echo "404页面: $([ -f "$ERROR_PAGES_DIR/404.html" ] && echo '✅ 已设置' || echo '❌ 未设置')"
echo "50x页面: $([ -f "$ERROR_PAGES_DIR/50x.html" ] && echo '✅ 已设置' || echo '❌ 未设置')"
echo "Favicon: $([ -f "$ERROR_PAGES_DIR/Favicon.png" ] && echo '✅ 已设置' || echo '❌ 未设置')"
echo "测试页面: $([ -f "$TEST_DIR/test-404.html" ] && echo '✅ 已创建' || echo '❌ 未创建')"

echo ""
echo "🧪 测试建议:"
echo "1. 访问不存在的页面测试404: https://dongboge.cn/nonexistent"
echo "2. 访问测试页面: https://dongboge.cn/test/test-404.html"
echo "3. 如果需要测试50x错误，可以临时停止Node.js服务"

echo ""
echo "✅ 错误页面设置完成！"