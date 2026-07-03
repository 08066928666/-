# AI 翻译输入法 · iOS（基于仓输入法 Hamster）

iOS 推荐以 **[仓输入法 Hamster](https://github.com/imfuxiao/Hamster)** 为上游（MIT 许可，Rime 引擎，1.6k+ stars），再叠加智能翻译。

## 为什么用 Hamster

- 成熟的 **librime** iOS 集成，打字连贯、词库丰富
- **MIT** 协议，比 GPL 更利于二次开发
- 已有键盘 UI、方案管理、iCloud 同步等

可参考 **[GuruIM](https://github.com/CauT/GuruIM)**（Hamster 分支 + AI 能力）的实现思路。

## 集成步骤

```bash
git clone --depth 1 https://github.com/imfuxiao/Hamster.git vendor/Hamster
cd vendor/Hamster
xed .   # Xcode 打开
```

在 Xcode 中：

1. 将本仓库 `ai-ime-ios/Shared/Translator.swift` 加入键盘 Target
2. 在 `KeyboardInputViewController` 发送/回车逻辑中调用 `Translator.bilingualSend`
3. 日常候选与拼音分词**不要改**，只拦截「发送」动作做翻译

## 本仓库 `ai-ime-ios/`

提供最小键盘扩展骨架 + 与 Android 共用的 `Translator.swift` / `dict.json`。  
**正式产品请 fork Hamster 并移植翻译模块**，不要仅用骨架版。

## 许可

- Hamster：MIT（v2.1.0 起）
- 翻译模块：随主项目
