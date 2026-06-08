/**
 * 整形済み明細 → RPA / row_kbn エクスポート
 */
import { HASEKO_KOSHU2_SEED } from "../hasekoKoshu2Seed.js";

const SEED_BY_ID = new Map(HASEKO_KOSHU2_SEED.map((r) => [String(r.id), r]));

/**
 * マッチ済み明細を row_kbn 形式へ
 * @param {Array<Record<string, unknown>>} matchedMeisai
 * @param {Array<Record<string, unknown>>} comments
 * @param {{ koshu2Id?: string, title?: string }} [sectionMeta]
 */
export function matchedMeisaiToRowKbn(matchedMeisai, comments = [], sectionMeta = {}) {
  const koshu2Id = String(sectionMeta.koshu2Id || matchedMeisai[0]?.koshu2_id || "1");
  const seed = SEED_BY_ID.get(koshu2Id);
  const output = [];

  output.push({ row_kbn: "1", koshu1_text: "通常工事" });
  output.push({
    row_kbn: "2",
    sel_koshu2_cd: koshu2Id,
    koshu2_cd: koshu2Id,
    koshu2_text: seed?.koshu2_text || "クロス",
    koshu2_koban: ""
  });

  for (const m of matchedMeisai || []) {
    output.push({
      row_kbn: "3",
      kojikomoku_id: m.kojikomoku_id || "",
      taisho1: m.taisho1 || "",
      taisho2: m.taisho2 || "",
      koji_naiyo: m.koji_naiyo || "",
      basho: m.basho || "",
      bui: m.bui || "",
      suryo: String(m.suryo ?? ""),
      tani: m.tani || "㎡",
      tanka: String(m.tanka ?? ""),
      kakaku: String(m.kakaku ?? ""),
      biko1: m.biko1 || "",
      maker: m.maker || "",
      type: m.type || "",
      _matchStatus: m._matchStatus,
      _confidence: m._confidence,
      _needsReview: m._needsReview || false
    });
  }

  for (const c of comments || []) {
    const text = String(c.text || c.raw || "").trim();
    if (!text) continue;
    output.push({
      row_kbn: "4",
      comment: text.startsWith("※") ? text : `※${text}`
    });
  }

  return output;
}

/**
 * WinActor / RPA 用フラット CSV 行
 * @param {Array<Record<string, unknown>>} matchedMeisai
 */
export function matchedMeisaiToRpaRows(matchedMeisai) {
  return (matchedMeisai || []).map((m, i) => ({
    row_index: i + 1,
    koshu2_id: m.koshu2_id || "",
    kojikomoku_id: m.kojikomoku_id || "",
    item_name: m.taisho1 || m.item_name || "",
    basho: m.basho || "",
    bui: m.bui || "",
    quantity: m.suryo ?? "",
    unit: m.tani || "",
    unit_price: m.tanka ?? "",
    line_amount: m.kakaku ?? "",
    hinban: m.type || "",
    match_status: m._matchStatus || "",
    confidence: m._confidence != null ? Number(m._confidence).toFixed(3) : "",
    needs_review: m._needsReview ? "YES" : "NO"
  }));
}

/** @param {Array<Record<string, unknown>>} rows */
export function rpaRowsToCsv(rows) {
  if (!rows.length) {
    return "row_index,koshu2_id,kojikomoku_id,item_name,basho,bui,quantity,unit,unit_price,line_amount,hinban,match_status,confidence,needs_review\n";
  }
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
