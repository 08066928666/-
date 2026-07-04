# Tokubai Hub — 稳定访问指南

> 临时链接（cloudflare / loca.lt）会过期，**不要用那些链接**。

---

## 方法一：一键打开（最稳定，推荐）

### Windows
**双击** 项目里的文件：

```
打开演示.bat
```

或双击：

```
TokubaiHub-デモ.html
```

### Mac / Linux
```bash
chmod +x 打开演示.sh
./打开演示.sh
```

无需安装、无需网络，浏览器直接打开完整演示。

---

## 方法二：本地运行完整版

1. 安装 Node.js：https://nodejs.org/ （LTS）
2. 双击 `tokubai-hub/start.bat`（Windows）
3. 或命令行：
   ```bash
   cd tokubai-hub
   npm run demo
   ```
4. 浏览器打开 http://localhost:3000

---

## 方法三：GitHub 在线地址（需设置一次）

当前仓库是**私有的**，外人无法打开在线链接。

### 若要永久在线地址，请任选其一：

**A. 将仓库设为公开（免费）**
1. GitHub → 仓库 Settings → General → Danger Zone → Change visibility → Public
2. Settings → Pages → Source 选 **Deploy from branch** → Branch: `gh-pages` → `/ (root)`
3. 等待 2 分钟，访问：**https://08066928666.github.io/-/**

**B. 保持私有**
- 使用上面的**方法一**或**方法二**即可，同样稳定。

---

## 演示账号

- 邮箱：`user@example.com`
- 密码：`demo1234`
