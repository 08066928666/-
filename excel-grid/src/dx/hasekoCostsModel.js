/**
 * 長谷工「見積登録」table#Costs 用データモデル（row_kbn 1/2/3/4）
 */
import { HASEKO_KOSHU2_SEED } from "./hasekoKoshu2Seed.js";

export { HASEKO_KOSHU2_SEED };

let _idSeq = 1;
export function nextCostsRowId() {
  _idSeq += 1;
  return _idSeq;
}

export function parseMoney(v) {
  const t = String(v ?? "")
    .trim()
    .replace(/[,，¥￥\s]/g, "");
  if (t === "" || t === "—") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n) {
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("ja-JP");
}

export function formatMoneyInput(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x === 0) return "";
  return String(x);
}

/** @typedef {{ id: number, row_kbn: "1"|"2"|"3"|"4", del_flg: string, fields: Record<string, string> }} CostsRow */

/**
 * @param {"1"|"2"|"3"|"4"} row_kbn
 * @param {Record<string, string|number>} [patch]
 * @returns {CostsRow}
 */
export function newCostsRow(row_kbn, patch = {}) {
  const base = { ...(patch.fields || patch) };
  if (row_kbn === "1") {
    return {
      id: patch.id ?? nextCostsRowId(),
      row_kbn: "1",
      del_flg: String(patch.del_flg ?? base.del_flg ?? "0"),
      fields: {
        koshu1_text: String(base.koshu1_text ?? "通常工事"),
        row_no: "",
        shusei_kbn: "0",
        del_flg: "0",
        ...base
      }
    };
  }
  if (row_kbn === "2") {
    const cd = String(base.sel_koshu2_cd ?? base.koshu2_cd ?? "1");
    const seed = HASEKO_KOSHU2_SEED.find((s) => s.id === cd);
    return {
      id: patch.id ?? nextCostsRowId(),
      row_kbn: "2",
      del_flg: String(patch.del_flg ?? base.del_flg ?? "0"),
      fields: {
        koshu2_koban: "",
        sel_koshu2_cd: cd,
        koshu2_cd: cd,
        koshu2_text: String(base.koshu2_text ?? seed?.koshu2_text ?? ""),
        row_no: "",
        shusei_kbn: "0",
        del_flg: "0",
        ...base
      }
    };
  }
  if (row_kbn === "4") {
    return {
      id: patch.id ?? nextCostsRowId(),
      row_kbn: "4",
      del_flg: String(patch.del_flg ?? base.del_flg ?? "0"),
      fields: {
        comment: String(base.comment ?? ""),
        row_no: "",
        shusei_kbn: "0",
        del_flg: "0",
        ...base
      }
    };
  }
  return {
    id: patch.id ?? nextCostsRowId(),
    row_kbn: "3",
    del_flg: String(patch.del_flg ?? base.del_flg ?? "0"),
    fields: {
      taisho1: "",
      taisho2: "",
      koji_naiyo: "",
      basho: "",
      bui: "",
      zumen_suryo: "",
      suryo: "",
      tani: "式",
      tanka: "",
      kakaku: "",
      kaito: "",
      owner_tanka: "",
      kashinushi_futan_wariai: "100.00",
      kashinushi_futan_kingaku: "",
      karinushi_futan_wariai: "0.00",
      karinushi_futan_kingaku: "0",
      biko1: "",
      biko2: "",
      maker: "",
      type: "",
      price: "",
      koshu2_cd: "",
      kojikomoku_id: "",
      row_no: "",
      shusei_kbn: "0",
      del_flg: "0",
      m_tanka: "",
      ...base
    }
  };
}

export function isRowActive(row) {
  return String(row?.del_flg ?? row?.fields?.del_flg ?? "0") !== "1";
}

/** 明細の価格・負担額を再計算 */
export function withComputedMeisai(fields) {
  const f = { ...fields };
  const suryo = parseMoney(f.suryo);
  const tanka = parseMoney(f.tanka);
  let kakaku = parseMoney(f.kakaku);
  if (!kakaku && suryo && tanka) kakaku = Math.round(suryo * tanka);
  f.kakaku = kakaku ? String(kakaku) : "";

  const kashiW = parseMoney(f.kashinushi_futan_wariai) || 100;
  const kariW = parseMoney(f.karinushi_futan_wariai);
  const kashiAmt = Math.round((kakaku * kashiW) / 100);
  const kariAmt = kariW > 0 ? Math.round((kakaku * kariW) / 100) : kakaku - kashiAmt;
  f.kashinushi_futan_kingaku = kakaku ? String(kashiAmt) : "";
  f.karinushi_futan_kingaku = kakaku ? String(Math.max(0, kariAmt)) : "";
  return f;
}

export function updateCostsField(rows, idx, field, value) {
  return rows.map((r, i) => {
    if (i !== idx) return r;
    const fields = { ...r.fields, [field]: String(value ?? "") };
    if (r.row_kbn === "3" && ["suryo", "tanka", "kakaku", "kashinushi_futan_wariai", "karinushi_futan_wariai"].includes(field)) {
      return { ...r, fields: withComputedMeisai(fields) };
    }
    if (r.row_kbn === "2" && field === "sel_koshu2_cd") {
      const seed = HASEKO_KOSHU2_SEED.find((s) => s.id === String(value));
      fields.koshu2_cd = String(value);
      if (seed && !fields.koshu2_text) fields.koshu2_text = seed.koshu2_text;
    }
    return { ...r, fields };
  });
}

export function toggleRowDelFlg(rows, idx) {
  return rows.map((r, i) => {
    if (i !== idx) return r;
    const on = isRowActive(r);
    const del = on ? "1" : "0";
    return { ...r, del_flg: del, fields: { ...r.fields, del_flg: del } };
  });
}

/** L1 相当: row_kbn=2 ブロック単位で配下明細を連動 */
export function toggleKoshu2Block(rows, idx) {
  const next = toggleRowDelFlg(rows, idx);
  const on = isRowActive(next[idx]);
  if (next[idx].row_kbn !== "2") return next;
  const out = [...next];
  for (let i = idx + 1; i < out.length; i++) {
    if (out[i].row_kbn === "1" || out[i].row_kbn === "2") break;
    const del = on ? "0" : "1";
    out[i] = { ...out[i], del_flg: del, fields: { ...out[i].fields, del_flg: del } };
  }
  return out;
}

export function moveCostsRow(rows, from, to) {
  if (to < 0 || to >= rows.length || from === to) return rows;
  const n = [...rows];
  const [item] = n.splice(from, 1);
  n.splice(to, 0, item);
  return n;
}

export function insertCostsRow(rows, afterIdx, row_kbn) {
  const n = [...rows];
  const ins = newCostsRow(row_kbn);
  if (row_kbn === "3" && afterIdx >= 0) {
    let koshu2 = "";
    for (let i = afterIdx; i >= 0; i--) {
      if (n[i].row_kbn === "2") {
        koshu2 = String(n[i].fields.sel_koshu2_cd || n[i].fields.koshu2_cd || "");
        break;
      }
    }
    if (koshu2) ins.fields.koshu2_cd = koshu2;
  }
  n.splice(afterIdx + 1, 0, ins);
  return n;
}

export function deleteCostsRow(rows, idx) {
  return rows.filter((_, i) => i !== idx);
}

/** structurePreview → CostsRow[] */
export function orderedBlocksToCostsRows(blocks) {
  /** @type {CostsRow[]} */
  const rows = [];
  let currentKoshu2 = "";
  for (const b of blocks || []) {
    const kind = String(b.kind);
    const f = b.fields && typeof b.fields === "object" ? { ...b.fields } : {};
    if (kind === "1") {
      rows.push(newCostsRow("1", { fields: { koshu1_text: String(f.koshu1_text || b.line1 || "").trim() || "通常工事", ...f } }));
      continue;
    }
    if (kind === "2") {
      currentKoshu2 = String(f.sel_koshu2_cd || f.koshu2_cd || b.L_koshu2_cd || "").trim();
      rows.push(
        newCostsRow("2", {
          fields: {
            sel_koshu2_cd: currentKoshu2 || "1",
            koshu2_cd: String(f.koshu2_cd || currentKoshu2),
            koshu2_text: String(f.koshu2_text || b.line1 || "").trim(),
            koshu2_koban: String(f.koshu2_koban || ""),
            ...f
          }
        })
      );
      continue;
    }
    if (kind === "4") {
      rows.push(newCostsRow("4", { fields: { comment: String(f.comment || b.line1 || "").trim(), ...f } }));
      continue;
    }
    if (kind !== "3") continue;
    const name = String(f.taisho1 || f.koji_naiyo || b.line1 || "").trim();
    if (!name || /^(（工事コード欠落）|（品目なし）)$/.test(name)) continue;
    const fields = {
      ...f,
      taisho1: String(f.taisho1 || name),
      koshu2_cd: String(f.koshu2_cd || f.sel_koshu2_cd || currentKoshu2)
    };
    rows.push(newCostsRow("3", { fields: withComputedMeisai(fields) }));
  }
  return rows;
}

export function parsedToCostsRows(parsed) {
  const fromBlocks = orderedBlocksToCostsRows(parsed?.structurePreview || []);
  if (fromBlocks.length) return fromBlocks;
  return [];
}

export function extractCostsMetaFromDoc(doc) {
  const title = doc.querySelector(".page-title")?.textContent?.trim() || doc.title || "";
  const mitsumori_name = doc.querySelector('[name="mitsumori_name"]')?.value ?? "";
  const mitsumori_bi = doc.querySelector('[name="mitsumori_bi"]')?.value ?? "";
  const kanryo_bi = doc.querySelector('[name="kanryo_bi"]')?.value ?? "";
  const estate = String(parsedEstateFromTitle(title)).trim();
  return { title, mitsumori_name, mitsumori_bi, kanryo_bi, estate };
}

function parsedEstateFromTitle(title) {
  return String(title || "")
    .replace(/見積登録\s*/g, "")
    .trim();
}

export function extractCostsMeta(parsed, docMeta = {}) {
  const estate = [parsed?.estateName, parsed?.roomNo].filter(Boolean).join(" ").trim();
  return {
    pageTitle: estate || docMeta.estate || docMeta.title || "見積明細",
    mitsumori_name: docMeta.mitsumori_name || "原状回復工事",
    mitsumori_bi: docMeta.mitsumori_bi || "",
    kanryo_bi: docMeta.kanryo_bi || ""
  };
}

/** 合計行（小計・諸経費6%・出精・税10%・総合計） */
export function computeCostsSummary(rows, opts = {}) {
  const keihiPct = Number(opts.keihi_wariai ?? 6);
  const nebikiDigit = Number(opts.nebiki_chi ?? 3);
  const taxRate = Number(opts.tax_rate ?? 0.1);

  let subtotal = 0;
  let kashiSub = 0;
  let kariSub = 0;

  for (const r of rows) {
    if (r.row_kbn !== "3" || !isRowActive(r)) continue;
    const f = withComputedMeisai(r.fields);
    const k = parseMoney(f.kakaku);
    subtotal += k;
    kashiSub += parseMoney(f.kashinushi_futan_kingaku);
    kariSub += parseMoney(f.karinushi_futan_kingaku);
  }

  const keihi = Math.round((subtotal * keihiPct) / 100);
  const chukei = subtotal + keihi;
  const pow = 10 ** nebikiDigit;
  const nebiki = chukei > 0 ? -(chukei % pow) : 0;
  const gokeiWoZei = chukei + nebiki;
  const tax = Math.floor(gokeiWoZei * taxRate);
  const sogokei = gokeiWoZei + tax;

  return {
    subtotal,
    kashiSub,
    kariSub,
    keihi,
    chukei,
    nebiki,
    gokeiWoZei,
    tax,
    sogokei,
    keihiPct,
    nebikiDigit
  };
}

const LS_KEY = "haseko-costs-draft-v1";

export function saveCostsDraft(payload) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadCostsDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
