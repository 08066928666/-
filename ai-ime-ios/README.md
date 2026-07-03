# iOS 键盘扩展

普通中文键盘 + 内置翻译功能。

## 快速开始（Mac）

```bash
brew install xcodegen   # 可选
./scripts/setup-xcode.sh
open AiIme.xcodeproj
```

手动创建亦可：Xcode → App + **Custom Keyboard Extension**，将 `AiIme/`、`AiImeKeyboard/`、`Shared/` 下源码加入对应 Target，并复制 `dict.json` 到 Bundle。

详见 [ai-ime-mobile/README.md](../ai-ime-mobile/README.md)
