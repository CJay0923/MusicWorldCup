#!/bin/bash
# scripts/deploy-surge.sh — 一键部署到 surge.sh
#
# 用法: bash scripts/deploy-surge.sh
#
# Surge 账户信息:
#
#   ★ 主账号（song-worldcup.surge.sh，未被451封锁）:
#     邮箱:   songworldcup2026@example.com
#     密码:   SongWorldCup2026!
#     Token:  67ea54e01f532d5372da0bd85eacfaa7
#     域名:   song-worldcup.surge.sh
#
#   备用账号（songcup-test-2026.surge.sh，被451封锁）:
#     邮箱:   songcup2026test@gmail.com
#     密码:   SongCup2026Test!
#     Token:  727ead98bd78e359b0a9f9cbeebaaf87
#     域名:   songcup-test-2026.surge.sh
#
#   已封禁账号（勿用）:
#     - songworldcup2026@gmail.com / song-worldcup-app.surge.sh → 451 法律封锁
#
# 注意:
#   - song-worldcup.surge.sh 在封锁政策生效前部署，未被 451 封锁
#   - 如需更换域名，修改下面的 DOMAIN 变量即可
#   - Token 可通过 surge SDK 重新生成:
#     node -e "const s=require('surge-sdk')({endpoint:'https://surge.surge.sh'});s.token({user:'email',pass:'pass'},{msg:'x'},(e,c)=>console.log(e,c))"
#   - 如忘记密码，访问 https://surge.sh/help/resetting-your-password 重置

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
DOMAIN="song-worldcup.surge.sh"
SURGE_TOKEN="67ea54e01f532d5372da0bd85eacfaa7"

echo "🚀 开始部署到 surge.sh..."
echo "   域名: $DOMAIN"
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

# 3. 部署到 surge
echo "📤 部署到 surge.sh..."
SURGE_TOKEN="$SURGE_TOKEN" surge ./dist "https://$DOMAIN"

echo ""
echo "✅ 部署成功！"
echo "   访问地址: https://$DOMAIN"
echo ""
echo "📋 账户信息:"
echo "   邮箱: songworldcup2026@example.com"
echo "   密码: SongWorldCup2026!"
echo "   域名: $DOMAIN"
