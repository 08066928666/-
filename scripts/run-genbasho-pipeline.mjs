#!/usr/bin/env node
/**
 * 原紙見積テキスト → DB 突合 → RPA 用出力
 *
 * 用法:
 *   node scripts/run-genbasho-pipeline.mjs <原紙.txt> [--db meisai_db.json] [--json out.json] [--tsv out.tsv] [--rpa out.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMeisaiDb } from "./genbasho/meisaiDb.mjs";
import { runGenbashoPipeline, exportRowsToTsv, exportRowsToRpaCsv } from "./genbasho/pipeline.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function parseArgs(argv) {
  let inputPath = "";
  let dbPath = path.join(ROOT, "scripts/genbasho/data/meisai_db.json");
  let jsonPath = "";
  let tsvPath = "";
  let rpaPath = "";
  let threshold = 0.78;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--db" && argv[i + 1]) dbPath = path.resolve(argv[++i]);
    else if (a === "--json" && argv[i + 1]) jsonPath = path.resolve(argv[++i]);
    else if (a === "--tsv" && argv[i + 1]) tsvPath = path.resolve(argv[++i]);
    else if (a === "--rpa" && argv[i + 1]) rpaPath = path.resolve(argv[++i]);
    else if (a === "--threshold" && argv[i + 1]) threshold = Number(argv[++i]);
    else if (!a.startsWith("-") && !inputPath) inputPath = path.resolve(a);
  }
  return { inputPath, dbPath, jsonPath, tsvPath, rpaPath, threshold };
}

const args = parseArgs(process.argv);

if (!args.inputPath) {
  const sample = path.join(ROOT, "scripts/genbasho/samples/cross_genbasho_sample.txt");
  if (fs.existsSync(sample)) {
    args.inputPath = sample;
    console.log(`（入力未指定 → サンプル使用: ${sample}）\n`);
  } else {
    console.error("用法: node scripts/run-genbasho-pipeline.mjs <原紙.txt> [--db db.json] [--json out.json] [--tsv out.tsv] [--rpa out.csv]");
    process.exit(1);
  }
}

if (!fs.existsSync(args.dbPath)) {
  console.error(`DB が見つかりません: ${args.dbPath}`);
  console.error("先に node scripts/build-meisai-db.mjs を実行してください。");
  process.exit(1);
}

const genbashoText = fs.readFileSync(args.inputPath, "utf-8");
const db = loadMeisaiDb(args.dbPath);
const result = runGenbashoPipeline(genbashoText, db, { matchThreshold: args.threshold });

const defaultOutDir = path.join(ROOT, "scripts/genbasho/out");
fs.mkdirSync(defaultOutDir, { recursive: true });

const baseName = path.basename(args.inputPath, path.extname(args.inputPath));
const jsonPath = args.jsonPath || path.join(defaultOutDir, `${baseName}_pipeline.json`);
const tsvPath = args.tsvPath || path.join(defaultOutDir, `${baseName}_rpa.tsv`);
const rpaPath = args.rpaPath || path.join(defaultOutDir, `${baseName}_rpa.csv`);

fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf-8");
fs.writeFileSync(tsvPath, exportRowsToTsv(result.export_rows), "utf-8");
fs.writeFileSync(rpaPath, exportRowsToRpaCsv(result.export_rows), "utf-8");

console.log("=== 原紙見積パイプライン ===\n");
console.log(`入力: ${args.inputPath}`);
console.log(`DB:   ${args.dbPath} (${db.entryCount} 件)`);
console.log("\n統計:");
console.log(`  工事セクション: ${result.stats.sections}`);
console.log(`  明細行:         ${result.stats.meisai_rows}`);
console.log(`  DB マッチ:      ${result.stats.matched_rows}`);
console.log(`  要確認:         ${result.stats.review_rows}`);
console.log(`  コメント:       ${result.stats.comments}`);

console.log("\n抽出・突合結果（明細）:");
for (const row of result.export_rows.filter((r) => r.row_kbn === "3")) {
  const flag = row._matched ? "✓" : row._needs_review ? "?" : "·";
  console.log(
    `  ${flag} ${row.basho} / ${row.bui} ${row.suryo}${row.tani} @${row.tanka} → ${row.taisho1} [${row._source}]`
  );
}

if (result.warnings.length) {
  console.log("\n警告:");
  for (const w of result.warnings) console.log(`  - ${JSON.stringify(w)}`);
}

console.log(`\n出力:`);
console.log(`  JSON: ${jsonPath}`);
console.log(`  TSV:  ${tsvPath}`);
console.log(`  RPA:  ${rpaPath}`);
