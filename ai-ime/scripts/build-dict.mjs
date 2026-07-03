#!/usr/bin/env node
/**
 * 从 mozillazg/phrase-pinyin-data 构建 iOS 级拼音词库
 * 用法: node scripts/build-dict.mjs [pinyin.txt路径]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || "/tmp/pinyin.txt";
const out = path.join(__dirname, "../dict-words.js");

function stripTone(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ü/g, "v")
    .replace(/v/g, "v")
    .replace(/[^a-z]/g, "");
}

function score(text) {
  const len = [...text].length;
  let s = 5000 - len * 80;
  if (len === 1) s += 200;
  if (len === 2) s += 400;
  if (len <= 4) s += 200;
  return s;
}

const COMMON_PHRASE_BOOST = new Set([
  "你好", "谢谢", "好的", "没问题", "加油", "厉害", "一起玩", "再来一局", "打得好",
  "开心", "可以", "加我", "我是中国人", "英语不太好", "很高兴", "再见", "不好意思",
  "厉害", "牛逼", "冲啊", "走吧", "开始", "等我", "马上", "来吧", "怎么样",
]);

const lines = fs.readFileSync(src, "utf8").split("\n");
const index = Object.create(null);
const chars = Object.create(null);

const COMMON_PHRASES = [
  ["nihaowoyewankaixin", "你好！我也玩得很开心。"],
  ["haodezailaiyijuba", "好的，再来一局吧。"],
  ["xiexieniyehenlihai", "谢谢，你也很厉害。"],
  ["woshizhongguorenyingyubutaihao", "我是中国人，英语不太好。"],
  ["meiwentiyiqijiayou", "没问题，一起加油！"],
  ["keyijiawoba", "可以，加我吧。"],
  ["womenyiqiwan", "我们一起玩"],
  ["yiqiwan", "一起玩"],
  ["zailaiyiju", "再来一局"],
  ["zailaiyijuba", "再来一局吧"],
  ["haode", "好的"],
  ["nihaoma", "你好吗"],
  ["dagaole", "打得好"],
  ["henlihai", "很厉害"],
  ["jiayou", "加油"],
  ["meiwenti", "没问题"],
  ["keyi", "可以"],
  ["jiaba", "加我吧"],
  ["chonga", "冲啊"],
  ["mingbai", "明白"],
  ["zhidaole", "知道了"],
  ["bukeqi", "不客气"],
  ["zaijian", "再见"],
];

for (const line of lines) {
  if (!line || line.startsWith("#")) continue;
  const idx = line.lastIndexOf(":");
  if (idx < 0) continue;
  const text = line.slice(0, idx).trim();
  const rawPy = line.slice(idx + 1).trim();
  if (!text || !rawPy) continue;

  const syllables = rawPy.split(/\s+/).filter(Boolean);
  const key = syllables.map(stripTone).join("");
  if (!key || key.length > 32) continue;
  if (!/^[a-z]+$/.test(key)) continue;

  const freq = score(text) + (COMMON_PHRASE_BOOST.has(text) ? 3000 : 0);
  if (!index[key]) index[key] = [];
  const exists = index[key].find((x) => x[0] === text);
  if (!exists) index[key].push([text, freq]);
  else exists[1] = Math.max(exists[1], freq);

  if ([...text].length === 1) {
    if (!chars[key]) chars[key] = new Set();
    chars[key].add(text);
  }
}

for (const [key, text] of COMMON_PHRASES) {
  const freq = score(text) + 5000;
  if (!index[key]) index[key] = [];
  const exists = index[key].find((x) => x[0] === text);
  if (!exists) index[key].push([text, freq]);
  else exists[1] = Math.max(exists[1], freq);
}

// 合并同词频排序、每键最多保留 12 条
for (const k of Object.keys(index)) {
  index[k].sort((a, b) => b[1] - a[1]);
  index[k] = index[k].slice(0, 12);
}

const charObj = {};
for (const [k, arr] of Object.entries(index)) {
  for (const [text] of arr) {
    if ([...text].length === 1) {
      if (!charObj[k]) charObj[k] = new Set();
      charObj[k].add(text);
    }
  }
}
for (const [k, set] of Object.entries(chars)) {
  if (!charObj[k]) charObj[k] = set;
  else for (const c of set) charObj[k].add(c);
}
const charOut = {};
for (const [k, set] of Object.entries(charObj)) {
  charOut[k] = [...(set instanceof Set ? set : [set])].slice(0, 10).join("");
}

// 控制体积：保留常用长度词组，约 1.5 万键
const compact = Object.create(null);
for (const [k, arr] of Object.entries(index)) {
  const maxLen = Math.max(...arr.map((x) => [...x[0]].length));
  const top = arr[0][1];
  if (maxLen === 1 && top < 5100) continue;
  if (maxLen > 10) continue;
  if (k.length > 24) continue;
  compact[k] = arr.slice(0, 8);
}

const BASIC_CHARS = {
  wo: "我握窝沃", ni: "你尼泥腻", hao: "好号毫", ma: "吗妈马嘛", de: "的得地", shi: "是时事",
  le: "了乐", zai: "在再", lai: "来", yi: "一以已", ju: "局句", ba: "吧把八", xie: "谢",
  hen: "很", li: "里理力", hai: "还海", ke: "可", men: "们门", wan: "玩完万", da: "打大",
  ge: "个", jia: "家加", you: "有又", ren: "人", bu: "不", hui: "会回", shuo: "说",
  zen: "怎", yang: "样", shen: "什", me: "么", ne: "呢", a: "啊", zhong: "中", guo: "国",
};

for (const [k, v] of Object.entries(BASIC_CHARS)) {
  charOut[k] = v;
  if (!compact[k]) compact[k] = v.split("").map((c, i) => [c, 5200 - i]);
}

const header = `/** 自动生成 · ${Object.keys(compact).length} 拼音键 · 勿手改 */\n`;
const body = `window.IME_DICT=${JSON.stringify(compact)};window.IME_CHARS=${JSON.stringify(charOut)};`;
fs.writeFileSync(out, header + body);
console.log("Wrote", out, "keys:", Object.keys(compact).length, "chars:", Object.keys(charOut).length);
