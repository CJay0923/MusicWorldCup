#!/bin/bash
# scripts/deploy-surge.sh — 一键部署到 surge.sh
#
# 用法: bash scripts/deploy-surge.sh
#
# 凭证保存在项目根目录的 .env.surge 文件中（已被 .gitignore 排除，不会提交到 Git）。
# 首次使用前，请手动创建 .env.surge 文件并填入以下字段：
#
#   SURGE_EMAIL=your_email@example.com
#   SURGE_PASSWORD=your_password
#   SURGE_TOKEN=your_token
#   SURGE_DOMAIN=your-domain.surge.sh
#
# 注意:
#   - .env.surge 已在 .gitignore 中排除，不会上传到任何远程仓库
#   - 如忘记密码，访问 https://surge.sh/help/resetting-your-password 重置
#   - Token 可通过 surge SDK 重新生成:
#     node -e "const s=require('surge-sdk')({endpoint:'https://surge.surge.sh'});s.token({user:'email',pass:'pass'},{msg:'x'},(e,c)=>console.log(e,c))"

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
ENV_FILE="$PROJECT_ROOT/.env.surge"

# 读取 .env.surge
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 未找到 .env.surge 文件！"
  echo "   请在项目根目录创建 .env.surge 并填入 SURGE_TOKEN 和 SURGE_DOMAIN"
  echo "   示例见 scripts/deploy-surge.sh 注释"
  exit 1
fi

# 加载环境变量
set -a
source "$ENV_FILE"
set +a

DOMAIN="${SURGE_DOMAIN:-song-worldcup.surge.sh}"

if [ -z "$SURGE_TOKEN" ]; then
  echo "❌ .env.surge 中缺少 SURGE_TOKEN"
  exit 1
fi

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
