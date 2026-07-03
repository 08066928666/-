# 退房无忧

日本租房退房自检助手 — 帮助租客在立会前完成自检、获取 AI 对策建议、了解合理价格区间，避免被过度收费。

与仓库内其他项目（如报价工具）**完全独立**，无关联。

## 启动

```bash
cd taisho-moyo
npm install
npm start
```

浏览器打开：**http://localhost:3000**

```bash
npm run serve   # 构建 + 启动（推荐，端口 3000）
npm start       # 开发模式（热更新）
```

## 功能（Demo）

- 房间自检向导（玄関 / トイレ / キッチン / 浴室 / LDK / 洋室）
- 拍照上传留存证据
- AI 分析（规则引擎）：清洁对策、立会话术、保价评估
- 退房报告汇总
- 专家服务预约（Demo UI）

## 技术栈

- React 18 + Vite 5
- Tailwind CSS
- 本地 localStorage 存储

## 目录

```
taisho-moyo/
├── src/
│   ├── App.jsx           # 主应用
│   ├── app.css           # 样式
│   ├── data/knowledgeBase.js
│   └── utils/
│       ├── analyzeIssue.js
│       └── storage.js
└── index.html
```
