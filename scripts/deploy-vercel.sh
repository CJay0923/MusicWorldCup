#!/bin/bash
# scripts/deploy-vercel.sh — 一键部署到 Vercel
#
# 用法: bash scripts/deploy-vercel.sh
#
# 首次使用:
#   1. npm i -g vercel  (已安装则跳过)
#   2. vercel login     (浏览器登录，只需一次)
#   3. bash scripts/deploy-vercel.sh
#
# 后续部署: 直接 bash scripts/deploy-vercel.sh 即可

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 检查 vercel CLI
if ! command -v vercel &> /dev/null; then
  echo "❌ 未找到 vercel CLI，正在安装..."
  npm install -g vercel
fi

# 检查登录状态
if ! vercel whoami &> /dev/null; then
  echo "🔐 未登录 Vercel，正在打开浏览器登录..."
  echo "   （浏览器中点击确认即可，登录后重新运行此脚本）"
  vercel login
  # 再次检查
  if ! vercel whoami &> /dev/null; then
    echo "❌ 登录失败，请重试"
    exit 1
  fi
fi

echo "✅ 已登录 Vercel: $(vercel whoami)"
echo ""

# 构建
echo "📦 构建项目..."
npm run build
echo ""

# 部署到生产环境
echo "📤 部署到 Vercel..."
DEPLOY_URL=$(vercel --prod --yes 2>&1 | grep -oP 'https://[a-z0-9-]+\.vercel\.app' | head -1)

echo ""
echo "✅ 部署成功！"
echo "   访问地址: $DEPLOY_URL"
echo "   控制台:   https://vercel.com/dashboard"
