/**
 * ブラウザ外で豊洲1415 HTML の取込件数を確認（linkedom で DOMParser 相当）
 * 実行: node scripts/demo-parse-toyosu.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parseHTML } from "linkedom";

globalThis.DOMParser = class DOMParser {
  parseFromString(html, _mime) {
    return parseHTML(html).document;
  }
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "../public/haseko-samples/toyosu-1415.html");
const html = readFileSync(htmlPath, "utf8");

const { parseHasekoHtmlToKojiAndMeisai } = await import("../src/dx/htmlKojiParse.js");
const { parseResultToGridRows } = await import("../src/dx/hasekoHtmlToGridRows.js");

const parsed = parseHasekoHtmlToKojiAndMeisai(html);
const { rows, meta, importCount, focusCategoryId, usedRowKbn } = parseResultToGridRows(parsed);

console.log("=== 豊洲1415 HTML 取込デモ ===\n");
console.log("物件:", meta.estateName || "—");
console.log("号室:", meta.roomNo || "—");
console.log("工事名:", (meta.constructionTitle || "—").slice(0, 60));
console.log("row_kbn 取込:", usedRowKbn ? "YES" : "NO");
console.log("明細行数:", importCount);
console.log("最多工種 categoryId:", focusCategoryId);
console.log("\n工種別件数:");
const byCat = {};
for (const r of rows) byCat[r.categoryId] = (byCat[r.categoryId] || 0) + 1;
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}
console.log("\n先頭3行:");
for (const r of rows.slice(0, 3)) {
  console.log(`  - [${r.categoryId}] ${r.taisho1} | ${r.basho} | ${r.suryo}${r.tani} | ¥${r.price}`);
}
console.log("\n（ブラウザ: 巡検 → 分组見積 → 「豊洲1415 サンプル」）\n");
