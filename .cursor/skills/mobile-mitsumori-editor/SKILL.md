---
name: mobile-mitsumori-editor
description: Optimize the Haseko mobile quote editor in excel-grid (見積編集). Use when editing SimpleQuoteEditor, PresetInput, NumberWheelPicker, DecimalWheelPicker, fieldPresets, mobile CSS, popover/wheel pickers, クロス貼替明細, taisho1/taisho2 ㎡ fields, or mobile multi-page flow (PropertyList → QuoteEditor).
---

# Mobile 見積編集 UI（excel-grid）

## 项目路径

- 主应用：`excel-grid/src/`
- 移动端编辑器：`excel-grid/src/dx/SimpleQuoteEditor.jsx`
- 预设输入：`excel-grid/src/dx/mobile/PresetInput.jsx`
- 小数滚轮：`excel-grid/src/dx/mobile/DecimalWheelPicker.jsx`
- 单列滚轮：`excel-grid/src/dx/mobile/WheelColumn.jsx`
- 预设数据：`excel-grid/src/dx/mobile/fieldPresets.js`
- 样式：`excel-grid/src/index.css`（`@media (max-width: 768px)` 区块）

## 字段与选择器模式

| 字段 key | 标签 | 选择器 |
|----------|------|--------|
| taisho1 | 天井 | `wheelMode: decimal`（整数 0–100 + 小数 0–9 → 如 8.3） |
| taisho2 | 壁 | 同上 |
| teika | 単価 | `wheelMode: preset`（800/1000/1200…） |
| basho, maker, biko… | 文字 | 列表 popover |

`getPickerMode()` / `hasFieldPicker()` 在 `fieldPresets.js` 定义。

## UI 约束（必须遵守）

1. **数字弹层**：锚定在输入框旁的 compact popover，禁止全屏 bottom sheet。
2. **Portal**：预设/滚层用 `createPortal(..., document.body)` + `position: fixed`，避免卡片 `overflow` 裁剪。
3. **壁纸㎡**：必须支持一位小数；用双列滚轮，不用 1–100 整数列表。
4. **触发按钮**：↕ 双 chevron，打开时深色高亮；文字字段用 ▤ 列表按钮。
5. **直接入力**：滚层底部文字链接「直接入力」，不用大 pill 按钮。
6. **数量**：张替类型 `autoSuryo = taisho1 + taisho2`（㎡）。

## 修改检查清单

- [ ] 滚层在首屏字段（場所/天井）附近不被裁切
- [ ] 小数滚轮显示「選択中 X.X ㎡」
- [ ] 移动端卡片 `.mobile-line-card { overflow: visible }`
- [ ] 不破坏桌面端 `SimpleQuoteEditor` 表格布局
- [ ] 改动后 `cd excel-grid && npm run build` 通过

## 原纸流水线（相关）

- `scripts/genbasho/` — クロス貼替原纸 → 系统见积匹配
- 样本：`scripts/genbasho/samples/cross_genbasho_sample.txt`

## 本地预览（手机）

```bash
cd excel-grid && npm run dev -- --host 0.0.0.0 --port 5173
npx cloudflared tunnel --url http://localhost:5173
```

`vite.config.js` 需 `server.allowedHosts: true` 以支持 tunnel。
