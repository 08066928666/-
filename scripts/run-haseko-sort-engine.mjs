/**
 * Node 版：与 haseko_quote_sort_engine.py 同构的 HTML → JSON（本机无 python 时使用）
 */
import fs from "node:fs";
import path from "node:path";

const KOUSHU2_META = {
  "1": { label: "クロス工事" },
  "2": { label: "床工事" },
  "3": { label: "建具工事" },
  "4": { label: "鋼製建具工事(廃止)" },
  "5": { label: "クリーニング工事" },
  "6": { label: "鍵工事" },
  "7": { label: "和室工事" },
  "8": { label: "塗装工事" },
  "9": { label: "雑工事" },
  "10": { label: "設備機器交換工事" },
  "11": { label: "内装工事(廃止)" },
  "12": { label: "必須工事" },
  "13": { label: "固定工事" },
  "14": { label: "設備点検(廃止)" },
  "15": { label: "その他(廃止)" },
  "16": { label: "交換工事" },
  "17": { label: "アスベスト関連" }
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
  const key = `${base}[${idx}]`;
  return (all[key] || "").trim();
}

function discoverIndices(all) {
  const idxs = new Set();
  for (const k of Object.keys(all)) {
    const m = /^row_kbn\[(\d+)\]$/.exec(k);
    if (m) idxs.add(Number(m[1]));
  }
  return [...idxs].sort((a, b) => a - b);
}

function parseCostsTable(html) {
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
      owner_tanka: parseIndexed(all, "owner_tanka", idx),
      kashinushi_futan_wariai: parseIndexed(all, "kashinushi_futan_wariai", idx),
      kashinushi_futan_kingaku: parseIndexed(all, "kashinushi_futan_kingaku", idx),
      karinushi_futan_wariai: parseIndexed(all, "karinushi_futan_wariai", idx),
      karinushi_futan_kingaku: parseIndexed(all, "karinushi_futan_kingaku", idx),
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

function walkAndBucket(raw) {
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

function sortDetails(details) {
  return [...details].sort((a, b) => {
    const [ia, sa] = koushuSortKey(a.bucket_cd);
    const [ib, sb] = koushuSortKey(b.bucket_cd);
    if (ia !== ib) return ia - ib;
    if (sa !== sb) return sa.localeCompare(sb);
    return a.source_row_index - b.source_row_index;
  });
}

function dec(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/[,,\s]/g, "");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function computeMoney(details) {
  let subtotal = 0;
  const lines = [];
  for (const d of details) {
    const suryo = dec(d.fields.suryo);
    const tanka = dec(d.fields.tanka);
    let kakaku = dec(d.fields.kakaku);
    if (!kakaku && suryo && tanka) kakaku = Math.round(suryo * tanka);
    subtotal += kakaku;
    lines.push({ bucket_cd: d.bucket_cd, kojikomoku_id: d.kojikomoku_id, amount: String(kakaku) });
  }
  const six = Math.round(subtotal * 0.06);
  const tenBase = subtotal + six;
  const ten = Math.round(tenBase * 0.1);
  return {
    subtotal_construction: String(subtotal),
    suggested_shokeihi_6pct: String(six),
    suggested_taxable_before_10pct: String(tenBase),
    suggested_consumption_tax_10pct: String(ten),
    lines
  };
}

const COLMAP = {
  taisho1: "C",
  taisho2: "D",
  basho: "E",
  bui: "F",
  zumen_suryo: "G",
  suryo: "H",
  tani: "I",
  tanka: "J",
  kakaku: "K",
  koji_naiyo: "B"
};

function toKoumokuJson(sorted, startRow = 15) {
  const koumoku_rows = sorted.map((d, i) => {
    const rnum = startRow + i;
    const cells = {};
    for (const [fname, col] of Object.entries(COLMAP)) {
      const val = d.fields[fname] ?? "";
      cells[`${col}${rnum}`] = String(val).trim();
    }
    return {
      logical_row: i + 1,
      excel_data_row: rnum,
      bucket_cd: d.bucket_cd,
      kojikomoku_id: d.kojikomoku_id,
      cells,
      raw_fields: d.fields
    };
  });
  return {
    meta: {
      engine: "run-haseko-sort-engine.mjs (parity with haseko_quote_sort_engine.py)",
      excel_column_map_hypothesis: COLMAP,
      data_start_row_hypothesis: startRow
    },
    koumoku_rows,
    money: computeMoney(sorted)
  };
}

const htmlPath = process.argv[2] || path.join(import.meta.dirname, "..", "見積登録　エスティメゾン豊洲レジデンスＡ棟　1415号室.html");
const outPath = process.argv[3];

if (!fs.existsSync(htmlPath)) {
  console.error("File not found:", htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf-8");
const raw = parseCostsTable(html);
const { details, comments } = walkAndBucket(raw);
const sorted = sortDetails(details);
const payload = toKoumokuJson(sorted);
payload.parse = {
  source_file: htmlPath,
  raw_row_count: raw.length,
  detail_count: sorted.length,
  comments
};
payload.raw_rows_debug = raw.slice(0, 30);
if (raw.length > 30) payload.raw_rows_debug_note = "truncated to 30 for debug";

const text = JSON.stringify(payload, null, 2);
if (outPath) {
  fs.writeFileSync(outPath, text, "utf-8");
  console.log("Wrote", outPath);
}
console.log(text);
