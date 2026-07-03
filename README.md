# 退房无忧 Demo + 长谷工报价原型

## 退房无忧（租客端 Demo）

在 `excel-grid` 目录下启动：

```bash
cd excel-grid
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可体验。

### Demo 功能

- **房间自检向导**：玄関 / トイレ / キッチン / 浴室 / LDK / 洋室
- **拍照上传**：留存证据（本地存储）
- **AI 分析**（规则引擎模拟）：识别问题类型，输出对策
- **保价评估**：基于长谷工系见积数据的合理价格区间
- **立会话术**：可直接使用的日语交涉文案
- **退房报告**：汇总预估负担与交渉余地
- **专家服务预约**（Demo UI）

### 切换应用

- 默认：退房无忧租客端
- 长谷工 B 端原型：`http://localhost:5173/?app=haseko`

---

## Haseko 报价点餐原型（B 端）

直接双击 `index.html`，或用浏览器打开该文件。

### 当前实现

- 左侧 13 个工事分类导航
- 右侧点餐卡片（已完整实现：壁纸工事、设备工事）
- 点击添加后进入明细列表
- 支持导出：
  - `estimate_export.json`
  - `estimate_export.tsv`（可直接用 Excel 打开）

### 导出字段

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
