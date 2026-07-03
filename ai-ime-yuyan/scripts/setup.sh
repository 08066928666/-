#!/usr/bin/env bash
# 拉取语燕输入法（YuyanIme）并叠加 AI 翻译插件
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="${VENDOR_DIR:-$ROOT/../vendor/YuyanIme}"
ADDON="$ROOT/addon/src/main/java/com/aiime/translate"
YUYAN_SDK="$VENDOR/yuyansdk/src/main/java"

echo "==> Target: $VENDOR"

if [[ ! -e "$VENDOR/.git" ]]; then
  mkdir -p "$(dirname "$VENDOR")"
  git clone --depth 1 https://github.com/gurecn/YuyanIme.git "$VENDOR"
else
  echo "==> Using existing clone"
fi

cd "$VENDOR"
git submodule update --init --depth 1 yuyansdk

echo "==> Copy translate addon"
mkdir -p "$YUYAN_SDK/com/aiime/translate"
cp -f "$ADDON"/*.kt "$YUYAN_SDK/com/aiime/translate/"

INPUT_VIEW="$YUYAN_SDK/com/yuyan/imemodule/keyboard/InputView.kt"
if ! grep -q "handleEnterSmartOrSend" "$INPUT_VIEW"; then
  echo "==> Patch InputView.kt"
  # import
  sed -i '/^import com.yuyan.imemodule.keyboard.container.SymbolContainer/a import com.aiime.translate.handleEnterSmartOrSend' "$INPUT_VIEW"
  # replace ENTER block
  python3 <<'PY'
from pathlib import Path
p = Path("yuyansdk/src/main/java/com/yuyan/imemodule/keyboard/InputView.kt")
text = p.read_text()
old = """            KeyEvent.KEYCODE_ENTER -> {
                if (DecodingInfo.isCandidatesEmpty || DecodingInfo.isAssociate) sendKeyEvent(keyCode)
                else commitDecInfoText(DecodingInfo.composingStrForCommit)
                resetToIdleState()
            }"""
new = """            KeyEvent.KEYCODE_ENTER -> {
                handleEnterSmartOrSend(
                    keyCode,
                    { sendKeyEvent(it) },
                    { commitDecInfoText(DecodingInfo.composingStrForCommit) },
                    { resetToIdleState() },
                )
            }"""
if old not in text:
    raise SystemExit("InputView ENTER block not found; YuyanIme may have changed")
p.write_text(text.replace(old, new))
PY
fi

STRINGS="$VENDOR/app/src/main/res/values/strings.xml"
if [[ -f "$STRINGS" ]] && ! grep -q "AI 翻译输入法" "$STRINGS"; then
  sed -i 's/语燕输入法/AI 翻译输入法（语燕引擎）/g' "$STRINGS" 2>/dev/null || true
fi

echo ""
echo "Done. Open in Android Studio:"
echo "  $VENDOR"
echo ""
echo "Build: ./gradlew :app:assembleOfflineDebug"
echo "License: YuyanIme is GPL-3.0 — keep source open if you distribute."
