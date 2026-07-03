# iOS 键盘扩展 + 翻译助手

普通中文键盘 + **复制歌词条** + **发送翻译**。

## 功能

| 功能 | 说明 |
|------|------|
| **复制歌词条** | 在 LINE 等 App 复制外文 → 宿主 App 底边或键盘上方显示双行字幕 |
| **发送翻译** | 输入中文点「发送」→ 自动译成英/日/韩并附带中文对照 |
| **发送预览** | 打字时键盘上方显示「将发送（英语）：…」 |

## 快速开始（Mac）

```bash
brew install xcodegen   # 可选
./scripts/setup-xcode.sh
open AiIme.xcodeproj
```

手动创建亦可：Xcode → App + **Custom Keyboard Extension**，将 `AiIme/`、`AiImeKeyboard/`、`Shared/` 下源码加入对应 Target，并复制 `dict.json` 到 Bundle。

### 必要配置

1. 键盘扩展 `Info.plist` 已设置 `RequestsOpenAccess = true`（剪贴板歌词条 + 联网翻译需要）
2. （可选）为 App 与键盘配置 App Group `group.com.aiime.translate`，共享目标语言设置

## 文件结构

```
Shared/
  Translator.swift       # 翻译核心（演示词典）
  LyricSubtitleView.swift
  SharedSettings.swift
AiIme/
  ContentView.swift      # 宿主 App + 剪贴板监听
  ClipboardMonitor.swift
  LyricBarView.swift
AiImeKeyboard/
  KeyboardViewController.swift
```

详见 [ai-ime-mobile/README.md](../ai-ime-mobile/README.md)
