# AI 翻译输入法 · Android（基于语燕 YuyanIme）

打字体验采用成熟开源 **[语燕输入法 YuyanIme](https://github.com/gurecn/YuyanIme)**（Rime 引擎，3k+ stars），在其上叠加 **智能翻译** 能力。

## 为什么用语燕

| 自研轻量版 `ai-ime-android/` | 语燕 + 翻译插件（推荐） |
|------------------------------|-------------------------|
| 词库与分词较简，打字易卡顿 | Rime 引擎，连续输入、词组、九宫格 |
| 适合演示 | 接近商用输入法体验 |

## 一键集成

```bash
cd ai-ime-yuyan
./scripts/setup.sh
```

脚本会：

1. 克隆 `gurecn/YuyanIme` 到 `vendor/YuyanIme`（若不存在）
2. 初始化 `yuyansdk` 子模块
3. 复制 `addon/` 翻译代码到 SDK
4. 打补丁：Enter 发送时可选智能翻译

然后用 **Android Studio** 打开 `vendor/YuyanIme`，编译安装。

```bash
cd vendor/YuyanIme
./gradlew :app:assembleOfflineDebug
```

## 翻译功能（你的构思）

- **日常输入**：完全走语燕 / Rime 拼音，与系统输入法一样连贯
- **发消息**：输入中文后按发送/回车 → 译成目标语 + 中文对照（可配置）
- **收消息**：复制外文 → 语燕自带剪贴板栏，可扩展「译剪贴板」（见 `SmartTranslate.kt`）

核心代码：`addon/src/main/java/com/aiime/translate/`

## 许可说明

- **YuyanIme**：GPL-3.0，分发 APK 需遵守开源义务
- **翻译插件**：与主项目相同许可策略，请保留版权声明

## 轻量演示版

若暂时不想编译语燕，可用 `ai-ime-android/` 简单 APK（已修复空格选词、连续拼音），但**正式产品请用语燕版**。
