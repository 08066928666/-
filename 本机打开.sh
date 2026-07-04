#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo " =========================================="
echo "   Tokubai Hub  本机打开（完整功能）"
echo " =========================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js"
  echo "请安装 LTS: https://nodejs.org/"
  exit 1
fi

if [ ! -f "$DIR/tokubai-hub/package.json" ]; then
  echo "[错误] 找不到 tokubai-hub 文件夹"
  exit 1
fi

cd "$DIR/tokubai-hub"

echo "[1/2] 安装依赖（首次较慢）..."
npm install

echo ""
echo "[2/2] 启动服务并打开浏览器..."
echo "按 Ctrl+C 可停止服务"
echo ""

node scripts/wait-and-open.js &
WAIT_PID=$!

trap 'kill $WAIT_PID 2>/dev/null || true' EXIT

npm run dev
