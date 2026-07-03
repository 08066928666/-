# AI 翻译输入法 · Windows 版

桌面端辅助工具：在任意 Windows 应用中，用中文输入、自动翻译成外语发送。适合无法安装系统输入法的 PC 场景。

## 功能

| 功能 | 说明 |
|------|------|
| **收消息** | 复制外文（或自动监听剪贴板）→ 弹出「原文 + 中文」对照 |
| **发消息** | `Ctrl+Shift+Space` 呼出输入栏 → 输入中文 → Enter 双语发送 |
| **智能模式** | 托盘菜单可开关；关闭后仅作普通文本输入 |
| **多语言** | 支持翻译为英语 / 日语 / 韩语 |
| **自动粘贴** | 发送后自动 `Ctrl+V` 到当前焦点窗口 |

## 安装

1. 安装 [Python 3.10+](https://www.python.org/downloads/)（勾选 **Add Python to PATH**）
2. 双击 `install.bat` 安装依赖
3. 双击 `run.bat` 启动

> 若全局热键无效，请右键 `run.bat` → **以管理员身份运行**。

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+Shift+Space` | 显示/隐藏底部输入栏 |
| `Ctrl+Shift+T` | 手动翻译当前剪贴板内容 |
| `Enter` | 在输入栏中发送（翻译 + 粘贴） |
| `Esc` | 隐藏输入栏 |

## 使用流程

### 看懂对方说什么

1. 在聊天窗口中**选中外文消息** → `Ctrl+C` 复制
2. 右上角自动弹出翻译卡片，显示中文对照

（智能模式 + 剪贴板监听开启时，复制后自动翻译，无需额外操作。）

### 用中文回复

1. 点击聊天输入框
2. 按 `Ctrl+Shift+Space` 呼出输入栏
3. 输入中文，例如：`好的，明天见`
4. 按 `Enter` → 自动翻译并粘贴，格式示例：

```
See you tomorrow.
（好的，明天见。）
```

## 配置

配置文件：`%USERPROFILE%\.ai-ime\config.json`

```json
{
  "smart_mode": true,
  "target_language": "en",
  "auto_paste": true,
  "bilingual_send": true,
  "clipboard_watch": true,
  "hotkey_toggle_bar": "ctrl+shift+space",
  "hotkey_translate_clipboard": "ctrl+shift+t",
  "window_opacity": 0.96
}
```

| 字段 | 说明 |
|------|------|
| `target_language` | 对方语言：`en` / `ja` / `ko` |
| `bilingual_send` | `true` 发送「外语 + 中文」；`false` 仅发送外语 |
| `auto_paste` | 发送后是否自动粘贴到当前窗口 |
| `clipboard_watch` | 是否监听剪贴板自动翻译 |

## 翻译引擎

- 默认使用 Google 翻译（`deep-translator`，需联网）
- 无网络时使用内置演示词典兜底
- 后续可接入 OpenAI / DeepL 等 API

## 系统托盘

启动后托盘区出现绿色 **AI** 图标：

- 呼出输入栏
- 翻译剪贴板
- 开关智能模式
- 退出

## 与其他版本的关系

| 目录 | 说明 |
|------|------|
| `../ai-ime-mobile/` | **iOS / Android 系统输入法（主推）** |
| `../ai-ime/index.html` | Web 演示原型 |
| `ai-ime-windows/` | 本目录，Windows 桌面辅助 |

## 已知限制

- 需要 Windows 10/11
- 全局热键在部分全屏应用中可能被拦截，可改用「复制翻译」流程
- 剪贴板监听会对所有复制操作生效；复制中文内容不会弹窗
- 首次使用 `keyboard` 库可能需要管理员权限

## 开发

```bash
pip install -r requirements.txt
python main.py
```
