# AI 翻译输入法 — 移动端（iOS / Android）

可安装到 **iOS** 和 **Android 系统** 的**普通中文输入法**，内置智能翻译：

- **日常输入**：完整拼音、词组与整句候选（对标系统输入法体验）
- **发消息**：中文输入 → 自动译成目标语言，可附带中文对照
- **收消息**：复制外文 → 一键插入中文对照（Android 键盘内；iOS 受系统权限限制）
- **内置词库**：约 4.1 万拼音键，覆盖常用聊天与日常用语

> 网页版 `ai-ime/` 仅为开发参考。请使用本目录下的原生工程打包安装。

## 目录结构

```
ai-ime-mobile/          # 共享词库与构建脚本
  scripts/build-dict-mobile.mjs
  shared/dict.json
ai-ime-android/         # Android APK（InputMethodService）
ai-ime-ios/             # iOS 键盘扩展（需 Mac + Xcode）
```

## Android 安装

### 环境

- Android Studio Hedgehog+ 或命令行 SDK
- JDK 17

### 构建 APK

```bash
cd ai-ime-android
# 用 Android Studio 打开本目录，或：
./gradlew assembleDebug
```

生成的 APK：`app/build/outputs/apk/debug/app-debug.apk`

### 安装到手机

1. 将 APK 传到手机并安装（需允许「未知来源」）
2. 打开 **AI 翻译输入法** App →「打开输入法设置」
3. 启用 **AI 翻译输入法**
4. 在微信、Telegram、邮件等任意 App 中切换到本键盘

### 使用

| 按键 | 功能 |
|------|------|
| 拼音字母 | 输入拼音，顶部显示候选 |
| 空格 | 上屏首选候选 |
| 智能 | 开关智能翻译 |
| 语言 | 切换目标语 en / ja / ko |
| 译剪贴板 | 将剪贴板外文译成中文并插入 |

## iOS 安装

iOS 键盘必须以 **Keyboard Extension** 形式安装，需要 Mac 与 Apple 开发者账号（真机调试可用免费账号）。

### 步骤

```bash
cd ai-ime-ios
chmod +x scripts/setup-xcode.sh
./scripts/setup-xcode.sh
open AiIme.xcodeproj
```

在 Xcode 中：

1. 将 `Shared/dict.json` 拖入 **AiIme** 与 **AiImeKeyboard** 两个 Target（勾选 Copy + 两个 Target）
2. 选择你的 Team，连接 iPhone，Run 主 App
3. iPhone：**设置 → 通用 → 键盘 → 键盘 → 添加新键盘 → AI 翻译输入法**
4. 建议开启「允许完全访问」以便后续接入网络翻译 API

### iOS 限制说明

- 键盘扩展**不能**直接读取其他 App 的聊天窗口
- 收消息翻译需用户**复制**外文，或在宿主 App 中处理
- 上架 App Store 需遵守 Apple 键盘扩展审核规则

## 更新词库

```bash
node ai-ime-mobile/scripts/build-dict-mobile.mjs /path/to/pinyin.txt
cp ai-ime-mobile/shared/dict.json ai-ime-android/app/src/main/assets/dict.json
cp ai-ime-mobile/shared/dict.json ai-ime-ios/Shared/dict.json
```

## 接入真实翻译 API

当前为离线演示词典。生产环境请在以下文件中替换 `Translator`：

- Android：`ai-ime-android/.../Translator.kt`
- iOS：`ai-ime-ios/Shared/Translator.swift`

推荐：DeepL、Google Cloud Translation、或自建 LLM 接口。注意键盘扩展的网络请求需在 iOS 开启 Full Access。

## 与 Windows 版关系

`ai-ime-windows/` 为桌面端辅助工具（全局热键 + 悬浮栏），适合无法在 PC 上安装系统输入法的场景，逻辑与移动端一致。
