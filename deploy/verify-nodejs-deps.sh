#!/bin/bash

# Node.js依赖验证脚本
# 用于检查服务器上的Node.js环境和依赖状态

echo "🔍 Node.js依赖验证开始..."
echo "=================================="

# 检查当前目录
echo "📁 当前工作目录: $(pwd)"
echo ""

# 检查Node.js版本
echo "🟢 Node.js环境检查:"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js版本: $NODE_VERSION"
else
    echo "❌ Node.js未安装"
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm版本: $NPM_VERSION"
else
    echo "❌ npm未安装"
    exit 1
fi

echo ""

# 检查package.json
echo "📦 package.json检查:"
if [ -f "package.json" ]; then
    echo "✅ package.json存在"
    echo "📋 package.json内容:"
    cat package.json | head -20
    echo ""
    
    # 检查关键字段
    if grep -q '"type".*"module"' package.json; then
        echo "✅ 项目类型: ES模块"
    else
        echo "⚠️ 项目类型: CommonJS (可能需要ES模块)"
    fi
    
    if grep -q '"astro"' package.json; then
        echo "✅ 包含Astro依赖"
    else
        echo "⚠️ 未找到Astro依赖"
    fi
else
    echo "❌ package.json不存在"
    echo "📝 建议创建基本的package.json:"
    echo 'cat > package.json << EOF
{
  "name": "dongboge",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/entry.mjs"
  },
  "dependencies": {
    "@astrojs/node": "^8.0.0",
    "astro": "^4.0.0"
  }
}
EOF'
    exit 1
fi

echo ""

# 检查node_modules
echo "📚 依赖包检查:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules目录存在"
    
    # 检查目录大小
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "📊 node_modules大小: $NODE_MODULES_SIZE"
    
    # 检查关键依赖
    CRITICAL_DEPS=("astro" "@astrojs/node")
    for dep in "${CRITICAL_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo "✅ $dep: 已安装"
        else
            echo "❌ $dep: 未安装"
        fi
    done
    
    # 列出已安装的包
    echo ""
    echo "📋 已安装的主要依赖:"
    npm list --depth=0 2>/dev/null | head -10 || echo "无法获取依赖列表"
    
else
    echo "❌ node_modules目录不存在"
    echo "💡 需要运行: npm install --production"
fi

echo ""

# 检查服务器入口文件
echo "🚀 服务器文件检查:"
if [ -f "server/entry.mjs" ]; then
    echo "✅ server/entry.mjs存在"
    
    # 检查文件大小
    ENTRY_SIZE=$(ls -lh server/entry.mjs | awk '{print $5}')
    echo "📊 文件大小: $ENTRY_SIZE"
    
    # 检查文件内容（前几行）
    echo "📄 文件开头内容:"
    head -5 server/entry.mjs 2>/dev/null || echo "无法读取文件内容"
    
    # 检查导入语句
    echo ""
    echo "📥 导入语句检查:"
    if grep -q "import.*astro" server/entry.mjs 2>/dev/null; then
        echo "✅ 包含Astro导入"
    else
        echo "⚠️ 未找到Astro导入"
    fi
    
    if grep -q "import.*@astrojs" server/entry.mjs 2>/dev/null; then
        echo "✅ 包含@astrojs导入"
    else
        echo "⚠️ 未找到@astrojs导入"
    fi
    
else
    echo "❌ server/entry.mjs不存在"
    echo "📁 server目录内容:"
    ls -la server/ 2>/dev/null || echo "server目录不存在"
fi

echo ""

# 尝试解析依赖
echo "🔍 依赖解析测试:"
if [ -f "server/entry.mjs" ] && [ -d "node_modules" ]; then
    echo "🧪 测试Node.js模块解析..."
    
    # 创建测试脚本
    cat > test_imports.mjs << 'EOF'
try {
    console.log('测试基本导入...');
    
    // 测试动态导入
    const testImport = async () => {
        try {
            // 测试是否能找到入口文件
            const entryPath = './server/entry.mjs';
            console.log(`尝试导入: ${entryPath}`);
            
            // 不实际导入，只检查文件
            const fs = await import('fs');
            if (fs.existsSync(entryPath)) {
                console.log('✅ 入口文件可访问');
            } else {
                console.log('❌ 入口文件不可访问');
            }
            
            // 测试Astro模块
            try {
                await import('astro');
                console.log('✅ Astro模块可导入');
            } catch (e) {
                console.log('❌ Astro模块导入失败:', e.message);
            }
            
        } catch (error) {
            console.log('❌ 导入测试失败:', error.message);
        }
    };
    
    await testImport();
    
} catch (error) {
    console.log('❌ 测试脚本执行失败:', error.message);
}
EOF
    
    # 运行测试
    node test_imports.mjs 2>&1
    
    # 清理测试文件
    rm -f test_imports.mjs
    
else
    echo "⚠️ 跳过依赖解析测试（缺少必要文件）"
fi

echo ""

# 检查环境变量
echo "🌍 环境变量检查:"
if [ -f ".env" ]; then
    echo "✅ .env文件存在"
    echo "📋 环境变量:"
    grep -E "^[A-Z_]+" .env | head -5 || echo "无法读取环境变量"
else
    echo "❌ .env文件不存在"
fi

echo ""

# 检查PM2状态
echo "⚙️ PM2服务检查:"
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2已安装"
    echo "📊 PM2进程状态:"
    pm2 list 2>/dev/null || echo "无法获取PM2状态"
    
    # 检查dongboge进程
    if pm2 list 2>/dev/null | grep -q "dongboge"; then
        echo "✅ dongboge进程存在"
        echo "📄 进程日志（最后10行）:"
        pm2 logs dongboge --lines 10 --nostream 2>/dev/null || echo "无法获取日志"
    else
        echo "⚠️ dongboge进程不存在"
    fi
else
    echo "❌ PM2未安装"
fi

echo ""

# 端口检查
echo "🔌 端口检查:"
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "✅ 端口3000正在监听"
    netstat -tlnp 2>/dev/null | grep ":3000"
else
    echo "❌ 端口3000未监听"
fi

echo ""

# 总结和建议
echo "📋 验证总结:"
echo "=================================="

# 检查关键问题
ISSUES=()

if [ ! -f "package.json" ]; then
    ISSUES+=("缺少package.json文件")
fi

if [ ! -d "node_modules" ]; then
    ISSUES+=("缺少node_modules目录")
fi

if [ ! -f "server/entry.mjs" ]; then
    ISSUES+=("缺少server/entry.mjs文件")
fi

if ! netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    ISSUES+=("端口3000未监听")
fi

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "🎉 所有检查通过！Node.js环境看起来正常。"
else
    echo "⚠️ 发现以下问题:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    
    echo ""
    echo "💡 建议的修复步骤:"
    echo "1. 确保package.json存在: ./deploy/fix-missing-files.sh"
    echo "2. 安装依赖: npm install --production"
    echo "3. 启动服务: ./deploy/start-service-with-pm2.sh"
fi

echo ""
echo "🔍 验证完成！"