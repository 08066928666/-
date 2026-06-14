#!/usr/bin/env node
/**
 * システム出力見積 HTML から明細マスタ DB を構築
 *
 * 用法:
 *   node scripts/build-meisai-db.mjs -o data/meisai-db.json
 *   node scripts/build-meisai-db.mjs path/to/見積登録.html -o data/meisai-db.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { parseHTML } from "linkedom";

globalThis.DOMParser = class DOMParser {
  parseFromString(html, _mime) {
    return parseHTML(html).document;
  }
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const { buildMeisaiDatabase } = await import("../src/dx/genkou/meisaiDatabase.js");

const DEFAULT_SOURCES = [
  join(__dirname, "../public/haseko-samples/toyosu-1415.html"),
  join(__dirname, "../../見積登録　エスティメゾン豊洲レジデンスＡ棟　1415号室.html"),
  join(__dirname, "../../見積登録　モノトーノ門前仲町　204号室.html")
];

function parseArgs(argv) {
  const out = { inputs: [], output: join(__dirname, "../data/meisai-db.json") };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") {
      out.output = resolve(argv[++i]);
    } else if (a === "-h" || a === "--help") {
      out.help = true;
    } else if (!a.startsWith("-")) {
      out.inputs.push(resolve(a));
    }
  }
  if (!out.inputs.length) out.inputs = DEFAULT_SOURCES;
  return out;
}

const args = parseArgs(process.argv);
if (args.help) {
  console.log(`用法: node scripts/build-meisai-db.mjs [html...] -o data/meisai-db.json`);
  process.exit(0);
}

/** @type {Array<{ html: string, source: string }>} */
const sources = [];
for (const p of args.inputs) {
  try {
    const html = readFileSync(p, "utf8");
    sources.push({ html, source: p });
    console.log(`✓ 読込: ${p}`);
  } catch (e) {
    console.warn(`⚠ スキップ (${p}): ${e.message}`);
  }
}

if (!sources.length) {
  console.error("HTML ソースが 1 件も読み込めませんでした。");
  process.exit(1);
}

const db = buildMeisaiDatabase(sources);
mkdirSync(dirname(args.output), { recursive: true });
writeFileSync(args.output, JSON.stringify(db, null, 2), "utf8");

console.log(`\n=== 明細 DB 構築完了 ===`);
console.log(`出力: ${args.output}`);
console.log(`ソース数: ${db.sourceCount}`);
console.log(`明細エントリ: ${db.entryCount}`);
console.log(`\n工種別件数:`);
for (const [cd, bucket] of Object.entries(db.byKoshu2).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  [${cd}] ${bucket.label}: ${bucket.entries.length} 件`);
}
