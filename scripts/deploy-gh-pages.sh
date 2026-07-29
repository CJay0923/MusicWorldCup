#!/bin/bash
# scripts/deploy-gh-pages.sh — 一键部署到 GitHub Pages
#
# 用法: bash scripts/deploy-gh-pages.sh
#
# GitHub Pages 信息:
#   仓库:   CJay0923/MusicWorldCup (public)
#   分支:   gh-pages
#   URL:    https://cjay0923.github.io/MusicWorldCup/
#
# 注意:
#   - 需要 gh CLI 已认证 (gh auth login)
#   - Surge.sh 部署已废弃（IP 级别 451 封锁，所有新部署均不可访问）
#   - 仅 song-worldcup.surge.sh 旧部署仍可访问（不属于本账户）

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
REPO="CJay0923/MusicWorldCup"
TEMP_DIR="/tmp/gh-pages-deploy"

echo "🚀 开始部署到 GitHub Pages..."
echo "   仓库: $REPO"
echo ""

# 1. 构建项目
echo "📦 构建项目..."
cd "$PROJECT_ROOT"
npm run build

# 2. 检查 dist 目录
if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "❌ 构建失败：dist/index.html 不存在"
  exit 1
fi

echo "✅ 构建完成"
echo ""

# 3. 准备 gh-pages 分支
echo "📤 准备部署文件..."
rm -rf "$TEMP_DIR"
gh repo clone "$REPO" "$TEMP_DIR" -- --depth 1 2>/dev/null || {
  echo "❌ 克隆仓库失败，请确认 gh CLI 已认证"
  exit 1
}

cd "$TEMP_DIR"
git checkout --orphan gh-pages 2>/dev/null
git rm -rf . 2>/dev/null || true
git clean -fdx 2>/dev/null || true

# 复制构建产物
cp -r "$DIST_DIR"/* .

git config user.email "cjay0923@users.noreply.github.com"
git config user.name "CJay0923"
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M') song world cup build"

# 4. 推送到 GitHub
echo "📤 推送到 GitHub Pages..."
gh auth setup-git 2>/dev/null
git push origin gh-pages --force

# 5. 等待构建
echo ""
echo "⏳ 等待 GitHub Pages 构建..."
for i in $(seq 1 12); do
  sleep 10
  STATUS=$(gh api "repos/$REPO/pages" --jq '.status' 2>/dev/null)
  if [ "$STATUS" = "built" ]; then
    echo "✅ 构建完成！"
    break
  fi
  echo "   构建中... ($i/12)"
done

echo ""
echo "✅ 部署成功！"
echo "   访问地址: https://cjay0923.github.io/MusicWorldCup/"
echo ""

# 清理
cd "$PROJECT_ROOT"
rm -rf "$TEMP_DIR"
