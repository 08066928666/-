/**
 * 長谷工「見積登録」HTML 取込結果 → DataGrid / 分组見積 用の行
 */
import { CATEGORY_DEFS } from "../constants.js";
import { createRow, enrichRowForGrid } from "../exportUtils.js";
import { HASEKO_KOSHU2_SEED } from "./hasekoKoshu2Seed.js";

/** 長谷工 sel_koshu2_cd / koshu2_cd（1〜17）→ 本プロトタイプの categoryId */
const KOSHU2_ID_TO_CATEGORY = {
  "1": "wallpaper",
  "2": "floor",
  "3": "joinery",
  "5": "cleaning",
  "6": "misc",
  "8": "paint",
  "9": "misc",
  "10": "equipment",
  "12": "misc",
  "13": "misc",
  "16": "equipment",
  "17": "misc"
};

const SEED_LABEL_TO_CATEGORY = new Map(
  HASEKO_KOSHU2_SEED.map((s) => {
    const cat =
      CATEGORY_DEFS.find((c) => c.label === s.label || c.koshu2_text === s.koshu2_text) ||
      CATEGORY_DEFS.find((c) => s.label.includes(c.label.replace(/工事$/, "")));
    return [String(s.id), cat?.id || "misc"];
  })
);

export function koshu2IdToCategoryId(koshu2Id) {
  const id = String(koshu2Id || "").trim();
  if (KOSHU2_ID_TO_CATEGORY[id]) return KOSHU2_ID_TO_CATEGORY[id];
  if (SEED_LABEL_TO_CATEGORY.has(id)) return SEED_LABEL_TO_CATEGORY.get(id);
  return "misc";
}

function parseNum(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isSkippableMeisaiName(name) {
  return !name || /^(（工事コード欠落）|（品目なし）)$/.test(name);
}

/**
 * @param {ReturnType<import('./htmlKojiParse.js').parseHasekoHtmlToKojiAndMeisai>} parsed
 * @returns {{ rows: ReturnType<typeof createRow>[], meta: { estateName: string, roomNo: string, constructionTitle: string }, importCount: number, focusCategoryId: string }}
 */
export function parseResultToGridRows(parsed) {
  const blocks = (parsed?.structurePreview || []).filter((b) => String(b.kind) === "3");
  const rows = [];
  const seen = new Set();

  for (const b of blocks) {
    const f = b.fields && typeof b.fields === "object" ? b.fields : {};
    const item = String(f.taisho1 || f.koji_naiyo || b.line1 || "").trim();
    if (isSkippableMeisaiName(item)) continue;

    const cd = String(b.L_koshu2_cd || f.sel_koshu2_cd || f.koshu2_cd || "").trim();
    const dedup = `${cd}|||${item}|||${f.basho || ""}|||${f.bui || ""}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const qty = parseNum(f.suryo);
    const tanka = parseNum(f.tanka);
    const categoryId = koshu2IdToCategoryId(cd);

    rows.push(
      enrichRowForGrid(
        createRow({
          categoryId,
          taisho1: item,
          taisho2: String(f.taisho2 || "").trim(),
          koji_naiyo: String(f.koji_naiyo || "").trim(),
          basho: String(f.basho || "").trim(),
          bui: String(f.bui || "").trim(),
          suryo: qty != null && qty >= 0 ? qty : 0,
          tani: String(f.tani || "式").trim() || "式",
          tanka: tanka != null && tanka >= 0 ? tanka : 0,
          biko1: String(f.biko1 || f.biko2 || "").trim(),
          maker: String(f.maker || "").trim(),
          type: String(f.type || "").trim()
        })
      )
    );
  }

  if (rows.length === 0 && Array.isArray(parsed?.masters)) {
    for (const m of parsed.masters) {
      const item = String(m.item_name || "").trim();
      if (!item) continue;
      const cd = String(m.koshu2_id || "").trim();
      const dedup = `${cd}|||${item}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      const qty = Number(m.quantity);
      rows.push(
        enrichRowForGrid(
          createRow({
            categoryId: koshu2IdToCategoryId(cd),
            taisho1: item,
            basho: String(m.basho || "").trim(),
            suryo: Number.isFinite(qty) && qty >= 0 ? qty : 0,
            tani: String(m.unit || "式").trim() || "式",
            tanka: Number(m.unit_price) || 0
          })
        )
      );
    }
  }

  const counts = {};
  for (const r of rows) {
    counts[r.categoryId] = (counts[r.categoryId] || 0) + 1;
  }
  const focusCategoryId =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || CATEGORY_DEFS[0]?.id || "wallpaper";

  return {
    rows,
    meta: {
      estateName: String(parsed?.estateName || "").trim(),
      roomNo: String(parsed?.roomNo || "").trim(),
      constructionTitle: String(parsed?.constructionTitle || "").trim()
    },
    importCount: rows.length,
    focusCategoryId,
    usedRowKbn: Boolean(parsed?.usedRowKbnImport)
  };
}
