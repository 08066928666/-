# AI 翻译输入法 — 移动端

**自带翻译功能的普通中文输入法**，可安装到 iOS / Android。

详见 [ROADMAP.md](ROADMAP.md)（为何网页/轻量版不够流畅、怎么办）。

## 推荐技术路线（采用 GitHub 成熟开源代码）

| 平台 | 上游项目 | Stars | 许可 | 本仓库集成 |
|------|----------|-------|------|------------|
| **Android** | [YuyanIme 语燕](https://github.com/gurecn/YuyanIme) | 3.4k+ | GPL-3.0 | [`ai-ime-yuyan/`](../ai-ime-yuyan/README.md) |
| **iOS** | [Hamster 仓输入法](https://github.com/imfuxiao/Hamster) | 1.6k+ | MIT | [`ai-ime-ios-hamster/`](../ai-ime-ios-hamster/README.md) |

语燕 / 仓输入法均基于 **Rime**，拼音连贯、词库完善。本项目的 **智能翻译** 作为插件叠加，不重复造输入法轮子。

## 快速开始

### Android（推荐）

```bash
cd ai-ime-yuyan
./scripts/setup.sh
# Android Studio 打开 vendor/YuyanIme
```

### iOS

```bash
# 见 ai-ime-ios-hamster/README.md
git clone https://github.com/imfuxiao/Hamster.git vendor/Hamster
```

### 轻量演示（不推荐正式使用）

| 目录 | 说明 |
|------|------|
| `ai-ime-android/` | 简易 APK，已修连续拼音 |
| `ai-ime-ios/` | 键盘扩展骨架 |
| `ai-ime/` | Web 演示（可能较慢） |

## 智能翻译功能

1. **普通输入**：Rime 拼音，与系统输入法一致
2. **发消息**：中文输入完成 → 发送时译成英/日/韩，可附带中文
3. **收消息**：复制外文 → 插入中文对照（Android 语燕剪贴板可扩展）

翻译核心：`SmartTranslate.kt` / `Translator.swift`（演示词典，可换 API）

## 词库

共享构建：`node ai-ime-mobile/scripts/build-dict-mobile.mjs`  
轻量演示版使用 `shared/dict.json`；语燕/仓输入法使用各自 Rime 词库（雾凇拼音等）。

## 目录

```
ai-ime-yuyan/          # Android：语燕 + 翻译插件 + setup.sh
ai-ime-ios-hamster/    # iOS：Hamster 集成说明
ai-ime-mobile/         # 共享词库脚本
ai-ime-android/        # 轻量 APK（演示）
ai-ime-ios/            # 轻量扩展（演示）
vendor/                # setup 脚本克隆的上游（不提交）
```
