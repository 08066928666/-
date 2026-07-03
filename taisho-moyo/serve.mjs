#!/usr/bin/env node
/**
 * 退房无忧 — 静态文件服务（仅服务本项目 dist，与仓库其他项目无关）
 */
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "dist");
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = createServer((req, res) => {
  let path = req.url?.split("?")[0] || "/";
  if (path === "/") path = "/index.html";
  const file = join(DIST, path);

  if (!file.startsWith(DIST) || !existsSync(file) || !statSync(file).isFile()) {
    const fallback = join(DIST, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(fallback));
    return;
  }

  const ext = extname(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(file));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("  退房无忧 Demo 已启动");
  console.log(`  → http://localhost:${PORT}`);
  console.log("");
});
