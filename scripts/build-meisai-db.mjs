#!/usr/bin/env node
/**
 * システム見積 HTML から明細マスタ DB を構築
 *
 * 用法:
 *   node scripts/build-meisai-db.mjs [html...] [-o db.json]
 *   node scripts/build-meisai-db.mjs   # 既定サンプル HTML を使用
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMeisaiDbFromHtmlFiles, saveMeisaiDb } from "./genbasho/meisaiDb.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const DEFAULT_HTML = [
  path.join(ROOT, "見積登録　エスティメゾン豊洲レジデンスＡ棟　1415号室.html"),
  path.join(ROOT, "見積登録　モノトーノ門前仲町　204号室.html"),
  path.join(ROOT, "excel-grid/public/haseko-samples/toyosu-1415.html")
];

function parseArgs(argv) {
  const htmlPaths = [];
  let outPath = path.join(ROOT, "scripts/genbasho/data/meisai_db.json");
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "-o" && argv[i + 1]) {
      outPath = path.resolve(argv[++i]);
    } else if (!argv[i].startsWith("-")) {
      htmlPaths.push(path.resolve(argv[i]));
    }
  }
  return {
    htmlPaths: htmlPaths.length ? htmlPaths : DEFAULT_HTML.filter((p) => fs.existsSync(p)),
    outPath
  };
}

const { htmlPaths, outPath } = parseArgs(process.argv);

if (!htmlPaths.length) {
  console.error("HTML ファイルが見つかりません。引数でパスを指定してください。");
  process.exit(1);
}

console.log("=== 明細 DB 構築 ===\n");
console.log("入力 HTML:");
for (const p of htmlPaths) console.log(`  - ${p}`);

const db = buildMeisaiDbFromHtmlFiles(htmlPaths);
saveMeisaiDb(db, outPath);

console.log(`\n出力: ${outPath}`);
console.log(`明細件数: ${db.entryCount}`);
console.log("\n工種別:");
for (const [cd, g] of Object.entries(db.byKoshu2).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  [${cd}] ${g.label}: ${g.entry_ids.length} 件`);
}
