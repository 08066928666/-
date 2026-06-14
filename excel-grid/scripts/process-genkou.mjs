#!/usr/bin/env node
/**
 * 原紙見積書テキスト → 抽出 → DB 突合 → RPA 出力
 *
 * 用法:
 *   node scripts/process-genkou.mjs samples/genkou-cross-sample.txt
 *   node scripts/process-genkou.mjs samples/genkou-cross-sample.txt --koshu cross --db data/meisai-db.json
 *   node scripts/process-genkou.mjs samples/genkou-cross-sample.txt --format rpa-csv -o out/rpa.csv
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
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
const { processGenkouText } = await import("../src/dx/genkou/genkouPipeline.js");

function parseArgs(argv) {
  const out = {
    input: "",
    dbPath: join(__dirname, "../data/meisai-db.json"),
    koshu: "cross",
    format: "json",
    output: "",
    minScore: 0.72,
    rebuildDb: false
  };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--db") out.dbPath = resolve(argv[++i]);
    else if (a === "--koshu") out.koshu = argv[++i];
    else if (a === "--format") out.format = argv[++i];
    else if (a === "-o" || a === "--output") out.output = resolve(argv[++i]);
    else if (a === "--min-score") out.minScore = Number(argv[++i]);
    else if (a === "--rebuild-db") out.rebuildDb = true;
    else if (a === "-h" || a === "--help") out.help = true;
    else if (!a.startsWith("-")) positional.push(resolve(a));
  }
  out.input = positional[0] || join(__dirname, "../samples/genkou-cross-sample.txt");
  return out;
}

function loadOrBuildDb(dbPath, rebuild) {
  if (!rebuild && existsSync(dbPath)) {
    return JSON.parse(readFileSync(dbPath, "utf8"));
  }
  execSync(`node "${join(__dirname, "build-meisai-db.mjs")}" -o "${dbPath}"`, {
    stdio: "inherit"
  });
  return JSON.parse(readFileSync(dbPath, "utf8"));
}

const args = parseArgs(process.argv);
if (args.help) {
  console.log(`用法: node scripts/process-genkou.mjs <原紙.txt> [--koshu cross] [--db data/meisai-db.json] [--format json|rpa-csv|row-kbn] [-o out]`);
  process.exit(0);
}

const genkouText = readFileSync(args.input, "utf8");
const db = loadOrBuildDb(args.dbPath, args.rebuildDb);

const result = processGenkouText(genkouText, db, {
  koshu: args.koshu,
  minScore: args.minScore
});

console.log(`\n=== 原紙見積書処理結果 ===`);
console.log(`入力: ${args.input}`);
console.log(`工種: ${args.koshu}`);
console.log(`明細: ${result.summary.totalMeisai} 件 (DB ヒット ${result.summary.dbHits} / 新規整形 ${result.summary.newFormatted} / 要確認 ${result.summary.needsReview})`);
console.log(`コメント: ${result.summary.comments} / 寸法行: ${result.summary.dimensions}`);

console.log(`\n--- 整形明細 ---`);
for (const m of result.matchedMeisai) {
  const flag = m._matchStatus === "db_hit" ? "✓DB" : "★NEW";
  console.log(
    `  [${flag}] ${m.basho} | ${m.bui} | ${m.suryo}${m.tani} | ¥${m.tanka} | ${m.taisho1} | 品番:${m.type || "—"} | conf:${(m._confidence ?? 0).toFixed(2)}`
  );
}

if (result.comments.length) {
  console.log(`\n--- コメント ---`);
  for (const c of result.comments) console.log(`  ※${c.text}`);
}

if (result.dimensions.length) {
  console.log(`\n--- 寸法（補助） ---`);
  for (const d of result.dimensions) {
    console.log(`  ${d.basho || "—"}: ${(d.dimensions || []).join(" ")}`);
  }
}

const baseOut = args.output || join(__dirname, "../data/genkou-output");
if (args.format === "rpa-csv") {
  const outPath = args.output || `${baseOut}.csv`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.rpa_csv, "utf8");
  console.log(`\nRPA CSV: ${outPath}`);
} else if (args.format === "row-kbn") {
  const outPath = args.output || `${baseOut}-row-kbn.json`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result.row_kbn_all, null, 2), "utf8");
  console.log(`\nrow_kbn JSON: ${outPath}`);
} else {
  const outPath = args.output || `${baseOut}.json`;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`\n完全 JSON: ${outPath}`);
}
