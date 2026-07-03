# 工作区说明

本仓库包含**两个独立项目**，互不关联：

## 1. 退房无忧（租客端）

**目录：** `taisho-moyo/`

日本租房退房自检助手，帮助租客避免立会时被过度收费。

```bash
cd taisho-moyo
npm install
npm start
```

打开：**http://localhost:5173**

## 2. Haseko 报价点餐原型（施工方 B 端）

**目录：** `excel-grid/` 或根目录 `index.html`

长谷工系见积录入原型，供施工方/管理公司使用。

```bash
cd excel-grid
npm install
npm run dev
```

---

快捷入口：双击根目录 `退房无忧.html` 可跳转到退房无忧开发服务（需先 `npm start`）。
