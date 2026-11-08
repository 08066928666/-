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
const OPTION_TAG_RE = /<option\b[^>]*>/gi;
const OPTION_VALUE_RE = /\bvalue="([^"]*)"/i;

// selected の付いた option の value を返す。value と selected の順序は問わない。
// 旧正規表現は `<option value="10" selected="">` を読めず全桶が "1" になっていた。
function selectedOptionValue(body) {
  let m;
  OPTION_TAG_RE.lastIndex = 0;
  while ((m = OPTION_TAG_RE.exec(body)) !== null) {
    const tag = m[0];
    if (/\bselected\b/i.test(tag)) {
      const vm = OPTION_VALUE_RE.exec(tag);
      if (vm) return vm[1];
    }
  }
  return null;
}

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
    const sv = selectedOptionValue(body);
    if (sv !== null) out[name] = sv;
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
    current_koshu2_cd_from_hidden: "",
    current_koshu2_koban: ""
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
      st.current_koshu2_koban = r.koshu2_koban;
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
      koshu2_koban: st.current_koshu2_koban,
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
      kashinushi_futan_wariai: r.kashinushi_futan_wariai,
      kashinushi_futan_kingaku: r.kashinushi_futan_kingaku,
      karinushi_futan_wariai: r.karinushi_futan_wariai,
      karinushi_futan_kingaku: r.karinushi_futan_kingaku,
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

// 帳票 96–102 行の式どおり。諸経費は ROUNDDOWN、出精値引で千円単位に切り捨て、
// 消費税の課税標準は値引後の合計。1415 号室の検証値：
// 小計 370,209 / 諸経費 22,212 / 値引 -421 / 値引後合計 392,000 /
// 消費税 39,200 / 総合計 431,200 / 貸主小計 219,193 / 借主小計 151,016。
function computeMoney(details) {
  let subtotal = 0;
  let lenderSum = 0;
  let borrowerSum = 0;
  const lines = [];
  for (const d of details) {
    const suryo = dec(d.fields.suryo);
    const tanka = dec(d.fields.tanka);
    let kakaku = dec(d.fields.kakaku);
    if (!kakaku && suryo && tanka) kakaku = Math.round(suryo * tanka);
    subtotal += kakaku;
    const lender = dec(d.fields.kashinushi_futan_kingaku);
    const borrower = dec(d.fields.karinushi_futan_kingaku);
    lenderSum += lender;
    borrowerSum += borrower;
    lines.push({ bucket_cd: d.bucket_cd, kojikomoku_id: d.kojikomoku_id, amount: String(kakaku), lender_amount: String(lender), borrower_amount: String(borrower) });
  }
  const six = Math.floor(subtotal * 0.06);
  const preNebiki = subtotal + six;
  const nebiki = -(preNebiki - Math.floor(preNebiki / 1000) * 1000);
  const totalAfter = preNebiki + nebiki;
  const ten = Math.floor(totalAfter * 0.1);
  const grand = totalAfter + ten;
  return {
    subtotal_construction: String(subtotal),
    shokeihi_6pct: String(six),
    total_before_nebiki: String(preNebiki),
    shussei_nebiki: String(nebiki),
    total_after_nebiki: String(totalAfter),
    consumption_tax_10pct: String(ten),
    grand_total: String(grand),
    lender_subtotal: String(lenderSum),
    borrower_subtotal: String(borrowerSum),
    suggested_shokeihi_6pct: String(six),
    suggested_taxable_before_10pct: String(totalAfter),
    suggested_consumption_tax_10pct: String(ten),
    lines
  };
}

// 検証済み「帳票」Sheet 列マップ（2026-11-07、1415号室実物で検証）。
// 旧推断（項目・A–K・15 行目）は誤りだったため置き換えた。
const CHOHYO_SHEET = "帳票";
const CHOHYO_HEADER_ROW = 20;
const CHOHYO_DATA_START_ROW = 24;
const CHOHYO_COLUMN_MAP = {
  name: "C", // taisho1 + koji_naiyo（実表で確認）
  basho: "O",
  zumen_suryo: "AD",
  suryo: "AH",
  tani: "AL",
  tanka: "AO",
  kakaku: "AS",
  biko1: "AC",
  kashinushi_futan_wariai: "AW",
  kashinushi_futan_kingaku: "AY",
  karinushi_futan_wariai: "BC",
  karinushi_futan_kingaku: "BE"
};
const COLMAP = CHOHYO_COLUMN_MAP; // 旧名（互換用）

function firstNonEmpty(...vals) {
  for (const v of vals) if (v) return v;
  return "";
}

function toChohyoJson(sorted, comments = [], startRow = CHOHYO_DATA_START_ROW) {
  const logical = [];
  let curK1 = null;
  let curK2 = null;
  const titleRowsFor = (d) => {
    const k1 = d.fields.koshu1_text || "";
    const k2 = [d.fields.koshu2_cd || "", d.fields.koshu2_text || ""];
    if (k1 && k1 !== curK1) {
      logical.push({ row_kind: "koshu1_title", src: d.source_row_index, cells: { A: k1 } });
      curK1 = k1;
      // 工種2タイトルは全局で一度だけ出す。実表でも「その他設備」は
      // 工種1が変わってもタイトル行は 1 回（帳票 52 行）だけ。
    }
    if (JSON.stringify(k2) !== JSON.stringify(curK2)) {
      curK2 = k2;
      const [cd, text] = k2;
      const label = text || KOUSHU2_META[cd]?.label || "";
      const koban = d.fields.koshu2_koban || "";
      const cells = text ? { A: koban, C: text } : { C: label };
      logical.push({ row_kind: "koshu2_title", src: d.source_row_index, cells });
    }
  };
  const makerNoteFor = (d) => {
    const maker = d.fields.maker || "";
    const type = d.fields.type || "";
    const price = d.fields.list_price || "";
    if (!maker && !type) return;
    let note = [maker, type].filter(Boolean).join("／");
    if (price) note += `／(定価)${price}`;
    logical.push({ row_kind: "maker_note", src: d.source_row_index, cells: { C: note } });
  };
  const crossGroups = new Map();
  for (const d of sorted) {
    if (d.bucket_cd === "1" && (d.fields.bui === "天井" || d.fields.bui === "壁")) {
      const key = d.fields.basho || "";
      if (!crossGroups.has(key)) crossGroups.set(key, []);
      crossGroups.get(key).push(d);
    }
  }
  const emitCross = (room, group) => {
    const first = group[0];
    titleRowsFor(first);
    const tenjo = group.find((g) => g.fields.bui === "天井");
    const kabe = group.find((g) => g.fields.bui === "壁");
    const n = tenjo ? dec(tenjo.fields.suryo) : 0;
    const r = kabe ? dec(kabe.fields.suryo) : 0;
    const ref = tenjo || kabe || first;
    const cells = {
      C: room,
      N: tenjo ? String(n) : "",
      R: kabe ? String(r) : "",
      AH: String(n + r),
      AL: firstNonEmpty(...group.map((g) => g.fields.tani || "")),
      AO: firstNonEmpty(...group.map((g) => g.fields.tanka || "")),
      AS: String(group.reduce((a, g) => a + dec(g.fields.kakaku), 0)),
      AC: firstNonEmpty(...group.map((g) => g.fields.biko1 || "")),
      AD: firstNonEmpty(...group.map((g) => g.fields.zumen_suryo || "")),
      AW: ref.fields.kashinushi_futan_wariai || "",
      AY: String(group.reduce((a, g) => a + dec(g.fields.kashinushi_futan_kingaku), 0)),
      BC: ref.fields.karinushi_futan_wariai || "",
      BE: String(group.reduce((a, g) => a + dec(g.fields.karinushi_futan_kingaku), 0))
    };
    logical.push({ row_kind: "cross_merged", src: first.source_row_index, bucket_cd: "1", room, cells });
  };
  const emitSingle = (d) => {
    titleRowsFor(d);
    const f = d.fields;
    const cells = {
      C: `${f.taisho1 || ""}${f.koji_naiyo || ""}`.trim(),
      O: f.basho || "",
      AD: f.zumen_suryo || "",
      AH: f.suryo || "",
      AL: f.tani || "",
      AO: f.tanka || "",
      AS: f.kakaku || "",
      AC: f.biko1 || "",
      AW: f.kashinushi_futan_wariai || "",
      AY: f.kashinushi_futan_kingaku || "",
      BC: f.karinushi_futan_wariai || "",
      BE: f.karinushi_futan_kingaku || ""
    };
    logical.push({ row_kind: "detail", src: d.source_row_index, bucket_cd: d.bucket_cd, kojikomoku_id: d.kojikomoku_id, cells, raw_fields: f });
    makerNoteFor(d);
  };
  const emittedCross = new Set();
  for (const d of sorted) {
    if (d.bucket_cd === "1" && (d.fields.bui === "天井" || d.fields.bui === "壁")) {
      const room = d.fields.basho || "";
      if (emittedCross.has(room)) continue;
      emittedCross.add(room);
      emitCross(room, crossGroups.get(room));
    } else {
      emitSingle(d);
    }
  }
  for (const c of [...comments].sort((a, b) => a.row_index - b.row_index)) {
    let pos = logical.length;
    for (let i = 0; i < logical.length; i++) {
      if (logical[i].src > c.row_index) { pos = i; break; }
    }
    logical.splice(pos, 0, { row_kind: "comment", src: c.row_index, cells: { C: c.comment } });
  }
  const chohyo_rows = logical.map((row, i) => {
    const rnum = startRow + i;
    const cells = {};
    for (const [col, val] of Object.entries(row.cells)) cells[`${col}${rnum}`] = String(val ?? "").trim();
    const out = { logical_row: i + 1, excel_row: rnum, row_kind: row.row_kind, cells };
    for (const k of ["bucket_cd", "kojikomoku_id", "room", "raw_fields"]) if (k in row) out[k] = row[k];
    return out;
  });
  return {
    meta: {
      engine: "run-haseko-sort-engine.mjs (parity with haseko_quote_sort_engine.py)",
      sheet: CHOHYO_SHEET,
      header_row: CHOHYO_HEADER_ROW,
      data_start_row: startRow,
      excel_column_map_verified: CHOHYO_COLUMN_MAP,
      notes: [
        "列は 2026-11-07 に 1415 号室の帳票実物で検証済み。",
        "クロスは部屋ごとに天井/壁を 1 行へ統合。AY/BE は部屋合計。",
        "BI（削除/修正前）は HTML に情報がないため出力しない。",
        "図面数量（AD）は本案で有値がなく未検証。",
        "実表は途中に空行があり、鍵/固定の工種1タイトル行が空行のため、後半の物理行番号は実表とずれる。列の対応は変わらない。"
      ]
    },
    chohyo_rows,
    money: computeMoney(sorted)
  };
}

function toKoumokuJson(sorted, startRow = CHOHYO_DATA_START_ROW) {
  const payload = toChohyoJson(sorted, [], startRow);
  payload.koumoku_rows = payload.chohyo_rows;
  return payload;
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
const payload = toChohyoJson(sorted, comments);
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
