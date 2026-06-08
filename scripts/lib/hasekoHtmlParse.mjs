/**
 * 長谷工 見積登録 HTML → 構造化 JSON（run-haseko-sort-engine と同構造）
 * genbasho パイプライン・DB 構築で共用
 */
import fs from "node:fs";

export const KOUSHU2_META = {
  "1": { label: "クロス工事", categoryId: "wallpaper" },
  "2": { label: "床工事", categoryId: "floor" },
  "3": { label: "建具工事", categoryId: "joinery" },
  "4": { label: "鋼製建具工事(廃止)", categoryId: null },
  "5": { label: "クリーニング工事", categoryId: "cleaning" },
  "6": { label: "鍵工事", categoryId: "misc" },
  "7": { label: "和室工事", categoryId: "joinery" },
  "8": { label: "塗装工事", categoryId: "paint" },
  "9": { label: "雑工事", categoryId: "misc" },
  "10": { label: "設備機器交換工事", categoryId: "equipment" },
  "11": { label: "内装工事(廃止)", categoryId: null },
  "12": { label: "必須工事", categoryId: "misc" },
  "13": { label: "固定工事", categoryId: "misc" },
  "14": { label: "設備点検(廃止)", categoryId: null },
  "15": { label: "その他(廃止)", categoryId: null },
  "16": { label: "交換工事", categoryId: "equipment" },
  "17": { label: "アスベスト関連", categoryId: "misc" }
};

const KOUSHU2_SORT_ORDER = [
  "1", "2", "3", "5", "6", "7", "8", "9", "10", "12", "13", "16", "17", "4", "11", "14", "15"
];

const INPUT_RE = /<input\b[^>]*\bname="([^"]+)"[^>]*(?:\/>|>)/gi;
const VALUE_RE = /\bvalue="([^"]*)"/i;
const SELECT_RE = /<select\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi;
const SELECTED_OPTION_RE = /<option[^>]+selected[^>]+value="([^"]*)"/i;

function extractInputs(html) {
  const out = {};
  let m;
  INPUT_RE.lastIndex = 0;
  while ((m = INPUT_RE.exec(html)) !== null) {
    const block = m[0];
    const nm = m[1];
    if (/type/i.test(block) && /radio/i.test(block)) continue;
    const vm = VALUE_RE.exec(block);
    out[nm] = vm ? vm[1] : "";
  }
  return out;
}

function extractSelects(html) {
  const out = {};
  let m;
  SELECT_RE.lastIndex = 0;
  while ((m = SELECT_RE.exec(html)) !== null) {
    const name = m[1];
    const body = m[2];
    const sm = SELECTED_OPTION_RE.exec(body);
    if (sm) out[name] = sm[1];
    else {
      const om = /<option[^>]+value="([^"]+)"/i.exec(body);
      if (om) out[name] = om[1];
    }
  }
  return out;
}

function mergeFields(html) {
  return { ...extractInputs(html), ...extractSelects(html) };
}

function parseIndexed(all, base, idx) {
  return (all[`${base}[${idx}]`] || "").trim();
}

function discoverIndices(all) {
  const idxs = new Set();
  for (const k of Object.keys(all)) {
    const m = /^row_kbn\[(\d+)\]$/.exec(k);
    if (m) idxs.add(Number(m[1]));
  }
  return [...idxs].sort((a, b) => a - b);
}

export function parseCostsTable(html) {
  const all = mergeFields(html);
  const indices = discoverIndices(all);
  const rows = [];
  for (const idx of indices) {
    const rkbn = parseIndexed(all, "row_kbn", idx);
    if (!rkbn) continue;
    rows.push({
      row_index: idx,
      row_kbn: rkbn,
      row_no: parseIndexed(all, "row_no", idx),
      koshu1_text: parseIndexed(all, "koshu1_text", idx),
      sel_koshu2_cd: parseIndexed(all, "sel_koshu2_cd", idx),
      koshu2_text: parseIndexed(all, "koshu2_text", idx),
      koshu2_cd: parseIndexed(all, "koshu2_cd", idx),
      koshu2_koban: parseIndexed(all, "koshu2_koban", idx),
      kojikomoku_id: parseIndexed(all, "kojikomoku_id", idx),
      taisho1: parseIndexed(all, "taisho1", idx),
      taisho2: parseIndexed(all, "taisho2", idx),
      koji_naiyo: parseIndexed(all, "koji_naiyo", idx),
      basho: parseIndexed(all, "basho", idx),
      bui: parseIndexed(all, "bui", idx),
      zumen_suryo: parseIndexed(all, "zumen_suryo", idx),
      suryo: parseIndexed(all, "suryo", idx),
      tani: parseIndexed(all, "tani", idx),
      tanka: parseIndexed(all, "tanka", idx),
      kakaku: parseIndexed(all, "kakaku", idx),
      kaito: parseIndexed(all, "kaito", idx),
      biko1: parseIndexed(all, "biko1", idx),
      biko2: parseIndexed(all, "biko2", idx),
      maker: parseIndexed(all, "maker", idx),
      type: parseIndexed(all, "type", idx),
      price: parseIndexed(all, "price", idx),
      comment: parseIndexed(all, "comment", idx)
    });
  }
  rows.sort((a, b) => a.row_index - b.row_index);
  return rows;
}

function koushuSortKey(cd) {
  const i = KOUSHU2_SORT_ORDER.indexOf(cd);
  return [i < 0 ? 999 : i, cd];
}

export function walkAndBucket(raw) {
  const st = {
    current_koshu1: "",
    current_koshu2_cd: "",
    current_koshu2_text: "",
    current_koshu2_cd_from_hidden: ""
  };
  const details = [];
  const comments = [];
  for (const r of raw) {
    if (r.row_kbn === "1") {
      st.current_koshu1 = r.koshu1_text;
      continue;
    }
    if (r.row_kbn === "2") {
      st.current_koshu2_text = r.koshu2_text;
      st.current_koshu2_cd_from_hidden = r.koshu2_cd;
      st.current_koshu2_cd = r.sel_koshu2_cd || r.koshu2_cd;
      continue;
    }
    if (r.row_kbn === "4") {
      if (r.comment.trim()) comments.push({ row_index: r.row_index, comment: r.comment.trim() });
      continue;
    }
    if (r.row_kbn !== "3") continue;
    const cd = r.sel_koshu2_cd || st.current_koshu2_cd || st.current_koshu2_cd_from_hidden || "0";
    const label = KOUSHU2_META[cd]?.label || `unknown(${cd})`;
    const fields = {
      koshu1_text: st.current_koshu1,
      koshu2_text: st.current_koshu2_text,
      koshu2_cd: st.current_koshu2_cd_from_hidden,
      sel_koshu2_cd: cd,
      kojikomoku_id: r.kojikomoku_id.trim(),
      taisho1: r.taisho1,
      taisho2: r.taisho2,
      koji_naiyo: r.koji_naiyo,
      basho: r.basho,
      bui: r.bui,
      zumen_suryo: r.zumen_suryo,
      suryo: r.suryo,
      tani: r.tani,
      tanka: r.tanka,
      kakaku: r.kakaku,
      biko1: r.biko1,
      biko2: r.biko2,
      maker: r.maker,
      type: r.type,
      list_price: r.price
    };
    details.push({
      bucket_cd: cd,
      bucket_label: label,
      source_row_index: r.row_index,
      row_no: r.row_no,
      kojikomoku_id: r.kojikomoku_id.trim(),
      fields
    });
  }
  return { details, comments };
}

export function sortDetails(details) {
  return [...details].sort((a, b) => {
    const [ia, sa] = koushuSortKey(a.bucket_cd);
    const [ib, sb] = koushuSortKey(b.bucket_cd);
    if (ia !== ib) return ia - ib;
    if (sa !== sb) return sa.localeCompare(sb);
    return a.source_row_index - b.source_row_index;
  });
}

export function parseHasekoHtmlFile(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf-8");
  const raw = parseCostsTable(html);
  const { details, comments } = walkAndBucket(raw);
  const sorted = sortDetails(details);
  return {
    source_file: htmlPath,
    raw_row_count: raw.length,
    detail_count: sorted.length,
    details: sorted,
    comments
  };
}
