/**
 * 原紙見積 → DB 突合 → RPA 用出力
 * フロー: 原始データ → 工具処理 → RPA 導入
 */
import { extractAllSections } from "./extractors/index.mjs";
import { matchExtractedToDb } from "./meisaiDb.mjs";
import { KOUSHU2_META } from "../lib/hasekoHtmlParse.mjs";

export const EXPORT_HEADERS = [
  "row_kbn",
  "koshu1_text",
  "koshu2_koban",
  "sel_koshu2_cd",
  "koshu2_text",
  "taisho1",
  "taisho2",
  "koji_naiyo",
  "basho",
  "bui",
  "zumen_suryo",
  "suryo",
  "tani",
  "tanka",
  "kakaku",
  "kashinushi_futan_wariai",
  "kashinushi_futan_kingaku",
  "karinushi_futan_wariai",
  "karinushi_futan_kingaku",
  "biko1",
  "maker",
  "type",
  "comment",
  "_matched",
  "_match_score",
  "_source",
  "_needs_review"
];

function rowToExportLine(row) {
  const o = {
    row_kbn: row.row_kbn || "3",
    koshu1_text: row.koshu1_text || "",
    koshu2_koban: row.koshu2_koban || "",
    sel_koshu2_cd: row.sel_koshu2_cd || "",
    koshu2_text: row.koshu2_text || "",
    taisho1: row.taisho1 || "",
    taisho2: row.taisho2 || "",
    koji_naiyo: row.koji_naiyo || "",
    basho: row.basho || "",
    bui: row.bui || "",
    zumen_suryo: row.zumen_suryo || "",
    suryo: row.suryo ?? "",
    tani: row.tani || "",
    tanka: row.tanka ?? "",
    kakaku: row.kakaku ?? "",
    kashinushi_futan_wariai: row.kashinushi_futan_wariai ?? 100,
    kashinushi_futan_kingaku: row.kashinushi_futan_kingaku ?? "",
    karinushi_futan_wariai: row.karinushi_futan_wariai ?? 0,
    karinushi_futan_kingaku: row.karinushi_futan_kingaku ?? 0,
    biko1: row.biko1 || "",
    maker: row.maker || "",
    type: row.type || "",
    comment: row.comment || "",
    _matched: row.matched ?? false,
    _match_score: row.match_score ?? "",
    _source: row._source || "",
    _needs_review: row._needs_review ?? false
  };
  return o;
}

export function runGenbashoPipeline(genbashoText, db, opts = {}) {
  const extractedSections = extractAllSections(genbashoText);
  const matchedSections = [];
  const exportRows = [];
  const warnings = [];

  for (const sec of extractedSections) {
    if (!sec.ok) {
      warnings.push({ type: "extract_failed", detail: sec });
      continue;
    }
    const matched = matchExtractedToDb(sec, db, { threshold: opts.matchThreshold ?? 0.78 });

    if (sec.hinban) {
      for (const r of matched.rows) {
        if (!r.type) r.type = sec.hinban;
      }
    }

    matchedSections.push(matched);

    const koshu2Cd = sec.sel_koshu2_cd;
    const koshuMeta = KOUSHU2_META[koshu2Cd];
    exportRows.push({
      row_kbn: "2",
      koshu1_text: sec.koshu1_text,
      sel_koshu2_cd: koshu2Cd,
      koshu2_text: sec.koshu2_text || koshuMeta?.label || "",
      taisho1: sec.title,
      type: sec.hinban || "",
      _source: "genbasho_title"
    });

    for (const r of matched.rows) {
      exportRows.push(rowToExportLine(r));
    }
    for (const c of matched.comments) {
      exportRows.push(rowToExportLine({ ...c, row_kbn: "4", comment: c.comment }));
    }
  }

  const stats = {
    sections: extractedSections.filter((s) => s.ok).length,
    meisai_rows: exportRows.filter((r) => r.row_kbn === "3").length,
    matched_rows: exportRows.filter((r) => r.row_kbn === "3" && r._matched).length,
    review_rows: exportRows.filter((r) => r._needs_review).length,
    comments: exportRows.filter((r) => r.row_kbn === "4").length
  };

  return {
    schemaVersion: 1,
    pipeline: "genbasho-to-rpa",
    processedAt: new Date().toISOString(),
    stats,
    warnings,
    extracted: extractedSections,
    matched: matchedSections,
    export_rows: exportRows
  };
}

export function exportRowsToTsv(rows) {
  const headers = EXPORT_HEADERS;
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[\t\n\r"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join("\t"), ...rows.map((r) => headers.map((h) => esc(r[h])).join("\t"))].join("\n");
}

export function exportRowsToRpaCsv(rows) {
  const meisai = rows.filter((r) => r.row_kbn === "3");
  const headers = [
    "sel_koshu2_cd",
    "kojikomoku_id",
    "taisho1",
    "basho",
    "bui",
    "suryo",
    "tani",
    "tanka",
    "type",
    "biko1",
    "_matched",
    "_needs_review"
  ];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    headers.join(","),
    ...meisai.map((r) =>
      headers
        .map((h) => {
          if (h === "kojikomoku_id") return esc(r.kojikomoku_id || "");
          return esc(r[h]);
        })
        .join(",")
    )
  ].join("\n");
}
