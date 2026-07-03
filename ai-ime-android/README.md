# Android 输入法

系统级 IME，基于 `InputMethodService`。普通拼音输入 + 内置智能翻译。

## 快速开始

1. 用 **Android Studio** 打开 `ai-ime-android` 目录
2. Sync Gradle → Run on device
3. 按 App 内指引启用输入法

## 核心类

| 文件 | 说明 |
|------|------|
| `AiImeService.kt` | 输入法服务入口 |
| `PinyinEngine.kt` | 拼音候选引擎 |
| `Translator.kt` | 智能翻译（演示版） |
| `assets/dict.json` | 词库（约 1.5MB） |

详见 [ai-ime-mobile/README.md](../ai-ime-mobile/README.md)
