# Haseko 报价点餐原型

## 打开方式

直接双击 `index.html`，或用浏览器打开该文件。

## 当前实现

- 左侧 13 个工事分类导航
- 右侧点餐卡片（已完整实现：壁纸工事、设备工事）
- 点击添加后进入明细列表
- 支持导出：
  - `estimate_export.json`
  - `estimate_export.tsv`（可直接用 Excel 打开）

## 导出字段

导出结构与 Tampermonkey 导入脚本对齐，包含：

- `row_kbn`（1=工种1, 2=工种2, 3=明细）
- `koshu1_text`
- `koshu2_koban`
- `sel_koshu2_cd`
- `koshu2_text`
- `taisho1`
- `taisho2`
- `koji_naiyo`
- `basho`
- `bui`
- `zumen_suryo`
- `suryo`
- `tani`
- `tanka`
- `price`
- `biko1`
- `maker`
- `type`
- `comment`
