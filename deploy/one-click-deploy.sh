#!/bin/bash

# 一键部署脚本 - 本地执行
# 使用方法: chmod +x one-click-deploy.sh && ./one-click-deploy.sh

set -e

echo "🚀 东博哥博客一键部署脚本"
echo "================================"

# 检查必要工具
check_requirements() {
    echo "🔍 检查必要工具..."
    
    if ! command -v git &> /dev/null; then
        echo "❌ Git 未安装，请先安装Git"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装，请先安装npm"
        exit 1
    fi
    
    echo "✅ 必要工具检查完成"
}

# 构建项目
build_project() {
    echo "🏗️ 构建项目..."
    npm install
    npm run build
    echo "✅ 项目构建完成"
}

# 推送到GitHub
push_to_github() {
    echo "📤 推送代码到GitHub..."
    
    # 检查是否有未提交的更改
    if [[ -n $(git status -s) ]]; then
        echo "📝 发现未提交的更改，正在提交..."
        git add .
        read -p "请输入提交信息 (默认: 更新博客内容): " commit_message
        commit_message=${commit_message:-"更新博客内容"}
        git commit -m "$commit_message"
    fi
    
    # 推送到远程仓库
    current_branch=$(git branch --show-current)
    git push origin $current_branch
    
    echo "✅ 代码推送完成"
}

# 检查GitHub Actions状态
check_deployment() {
    echo "⏳ GitHub Actions将自动部署到服务器..."
    echo "🌐 部署完成后可访问: https://www.dongboge.cn"
    echo ""
    echo "📋 你可以在以下地址查看部署状态:"
    git_url=$(git config --get remote.origin.url)
    if [[ $git_url == *"github.com"* ]]; then
        repo_path=$(echo $git_url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
        echo "   https://github.com/$repo_path/actions"
    fi
}

# 主函数
main() {
    echo "开始执行一键部署..."
    echo ""
    
    check_requirements
    echo ""
    
    build_project
    echo ""
    
    push_to_github
    echo ""
    
    check_deployment
    echo ""
    
    echo "🎉 一键部署脚本执行完成！"
    echo "📱 请查看GitHub Actions的部署状态"
}

# 执行主函数
main