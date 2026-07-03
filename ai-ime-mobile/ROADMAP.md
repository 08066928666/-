# 为什么还不够流畅？怎么办？

市面输入法（搜狗、微信、苹果）流畅，是因为它们在 **系统 IME 层** 用了 **Rime/librime** 级引擎 + 多年优化。  
本仓库里有两条线，体验差距很大：

| 版本 | 流畅度 | 适合 |
|------|--------|------|
| **语燕 / 仓（Rime）** | 接近商用 | **正式产品** |
| Web 演示 / `ai-ime-android` 轻量版 | 明显落后 | 看界面、验证翻译逻辑 |

**结论：想要市面级流畅，必须用 `ai-ime-yuyan`（Android）或 Hamster（iOS），网页和轻量 APK 做不到同等水平。**

---

## 商用输入法多出来的能力

1. **Rime 引擎**：音节切分、造词、用户词库、模糊音、整句输入  
2. **系统预编辑**：`setComposingText`，输入框里拼音带下划线，和系统键盘一致  
3. **联想词**：上屏后自动出「我们 → 的 / 是 / 吗」  
4. **原生 UI**：候选栏复用 View，不在每键重建界面  
5. **大词库 + 词频学习**：雾凇拼音等 100 万+ 词条，越用越准  

轻量版只有 4 万 JSON 键、无 Rime、Web 还用 React 渲染 —— 卡顿是预期内的。

---

## 推荐路线（按优先级）

### 第一步：Android 用语燕（必做）

```bash
cd ai-ime-yuyan
./scripts/setup.sh
```

用 Android Studio 打开 `vendor/YuyanIme`，编译装手机。  
也可直接装官方 [语燕 APK](https://github.com/gurecn/YuyanIme/releases) 感受 Rime 流畅度，再换我们打了翻译补丁的版本。

已叠加：`SmartTranslate`（发送时翻译 + 剪贴板对照）。

### 第二步：iOS 用仓输入法 Hamster

```bash
git clone https://github.com/imfuxiao/Hamster.git vendor/Hamster
```

MIT 协议，Rime 同款引擎。把 `ai-ime-yuyan/addon` 里的翻译逻辑移植到发送键即可。

### 第三步：翻译接真 API

替换 `SmartTranslate.kt` / `Translator.swift` 里的演示词典为 DeepL、Google、或自建 LLM。  
输入流畅度不靠翻译模块，靠 Rime。

### 第四步（可选）：上架与合规

- Android 语燕：**GPL-3.0**，分发须开源  
- iOS 键盘扩展：需 Apple 开发者账号、审核「完全访问」说明  
- **隐私与法规**：见 [COMPLIANCE_合规与隐私.md](COMPLIANCE_合规与隐私.md)（剪贴板默认关、不做读屏、云端翻译须同意）

---

## 轻量版已做的改进（仍弱于 Rime）

- `consumeComposing` 连续拼音  
- Android：`setComposingText` 系统预编辑  
- 简易联想词索引  
- 候选栏 View 复用，减少卡顿  

**若你仍在用网页预览**：请改用手机上的语燕版，差别会非常明显。

---

## 你可以怎么选

| 你的情况 | 建议 |
|----------|------|
| 没有 Mac，有安卓机 | `ai-ime-yuyan` → Android Studio 编译 APK |
| 有 iPhone + Mac | fork Hamster + 翻译模块 |
| 只想先看翻译效果 | Web 演示即可，别指望打字手感 |
| 想长期做自己的品牌 | 以语燕/Hamster 为底，只维护翻译与 UI 皮肤 |

需要的话我可以按你的设备（只有安卓 / 只有苹果 / 都有）写一份 **逐步点击安装清单**。
