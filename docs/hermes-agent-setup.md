# Hermes Agent 安装与项目使用

Hermes Agent 是 Nous Research 的独立 AI Agent 运行时，与 Cursor 是**不同产品**。  
本仓库已包含 **Cursor Skill**（`.cursor/skills/mobile-mitsumori-editor/`），在 Cursor 里打开本项目即可自动加载，无需 Hermes 也能优化见积移动端。

若要在本机额外安装 Hermes Agent，按系统选择：

## Windows（你提供的命令）

以 **PowerShell**（建议「以管理员身份运行」）执行：

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

安装完成后重启终端，验证：

```powershell
hermes --version
```

默认目录：`%LOCALAPPDATA%\hermes\hermes-agent`

## macOS / Linux

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

验证：

```bash
hermes --version
```

默认目录：`~/.hermes`

## 在本项目中使用 Hermes

```bash
cd /path/to/this-repo
hermes
```

首次可在 Hermes 对话里说明：优化 `excel-grid` 移动端见积编辑（SimpleQuoteEditor、PresetInput、小数滚轮等）。

### 安装 Hermes 官方 skill（可选）

```bash
hermes skills install official/autonomous-ai-agents/hermes-agent
hermes skills list
```

### 与 Cursor Skill 的关系

| 方式 | 位置 | 适用 |
|------|------|------|
| Cursor Skill | `.cursor/skills/mobile-mitsumori-editor/SKILL.md` | Cursor IDE / Cloud Agent |
| Hermes Skill | `~/.hermes/skills/` | Hermes CLI / Telegram 等 |

两者都使用 `SKILL.md` 格式，内容可同步维护。

## 常见问题

- **Cloud Agent 无法替你装到家用 PC**：必须在你的 Windows 上本地执行 `install.ps1`。
- **PowerShell 执行策略**：若被拦截，先运行 `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`。
- **与 Cursor 重复**：日常改代码继续用 Cursor；Hermes 适合多平台网关、定时任务、子 Agent 等场景。
