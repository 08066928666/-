#!/usr/bin/env bash
# 在 Mac 上生成 Xcode 工程骨架（需已安装 XcodeGen: brew install xcodegen）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cat > project.yml <<'YAML'
name: AiIme
options:
  bundleIdPrefix: com.aiime
  deploymentTarget:
    iOS: "16.0"
targets:
  AiIme:
    type: application
    platform: iOS
    sources:
      - AiIme
      - Shared
    settings:
      PRODUCT_BUNDLE_IDENTIFIER: com.aiime.keyboard
  AiImeKeyboard:
    type: app-extension
    platform: iOS
    sources:
      - AiImeKeyboard
      - Shared
    settings:
      PRODUCT_BUNDLE_IDENTIFIER: com.aiime.keyboard.extension
    dependencies:
      - target: AiIme
    info:
      path: AiImeKeyboard/Info.plist
      properties:
        CFBundleDisplayName: AI 翻译输入法
YAML

if command -v xcodegen >/dev/null 2>&1; then
  xcodegen generate
  echo "Generated AiIme.xcodeproj — open in Xcode and build to device."
else
  echo "Install xcodegen first: brew install xcodegen"
  echo "Or manually: File → New → App + Keyboard Extension, copy Swift files from AiIme/ AiImeKeyboard/ Shared/"
fi
