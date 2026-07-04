#!/bin/bash
# 一键打开离线演示（macOS / Linux）
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$DIR/TokubaiHub-デモ.html" ]; then
  FILE="$DIR/TokubaiHub-デモ.html"
elif [ -f "$DIR/tokubai-hub/demo-standalone.html" ]; then
  FILE="$DIR/tokubai-hub/demo-standalone.html"
else
  echo "找不到演示文件"
  exit 1
fi
echo "打开: $FILE"
if command -v xdg-open >/dev/null; then xdg-open "$FILE"
elif command -v open >/dev/null; then open "$FILE"
else echo "请用浏览器打开: $FILE"
fi
