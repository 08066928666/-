/** 長谷工 HTML field[name=...] と見積列 B〜K の対応（平板・手风琴明細行用） */

export const MEISAI_BK_COLUMNS = [
  { id: "B", label: "施工内容", keys: ["koji_naiyo", "koji_title", "seko_naiyo", "gyomu_naiyo", "naiyo"] },
  { id: "C", label: "项目名称", keys: ["taisho1", "hinmei", "mei", "hinmei_text"] },
  { id: "D", label: "详细规格", keys: ["taisho2", "zumen_suryo", "spec", "hinban", "hinban_cd"] },
  { id: "E", label: "场所", keys: ["basho", "basyo", "place"] },
  { id: "F", label: "部位", keys: ["bui", "busho"] },
  { id: "G", label: "数量", keys: ["suryo", "qty"] },
  { id: "H", label: "单位", keys: ["tani", "unit"] },
  { id: "I", label: "单价", keys: ["tanka", "unit_price", "tanka_ex"] },
  { id: "J", label: "金额", keys: ["kingaku", "price", "kingaku1", "gaku"] },
  { id: "K", label: "备注原因", keys: ["biko1", "biko", "comment", "biko2", "bikou"] }
];

function pickFieldStr(f, keys) {
  for (const k of keys) {
    const v = f[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseNumLoose(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/¥|￥|\s/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formatYen(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/**
 * 明細1行 → B〜K 表示用（HTML fields 優先、無ければ ln の集計値）
 * @param {{ item_name?: string, basho?: string, quantity?: number|null, unit?: string, unit_price?: number|null, fields?: Record<string, string> }} ln
 * @returns {Record<string, string>}
 */
export function meisaiLineToBkCells(ln) {
  const f = ln.fields && typeof ln.fields === "object" ? ln.fields : {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const col of MEISAI_BK_COLUMNS) {
    out[`${col.id}_${col.label}`] = pickFieldStr(f, col.keys);
  }

  const c = String(ln.item_name || "").trim();
  if (c) out.C_项目名称 = c;
  else if (!out.C_项目名称) out.C_项目名称 = "—";

  const basho = String(ln.basho || "").trim();
  if (basho) out.E_场所 = basho;
  else if (!out.E_场所) out.E_场所 = "—";

  const qtyParsed = parseNumLoose(f.suryo) ?? (ln.quantity != null && Number.isFinite(ln.quantity) ? ln.quantity : null);
  const gFromField = parseNumLoose(out.G_数量);
  out.G_数量 =
    qtyParsed != null && qtyParsed > 0
      ? String(qtyParsed)
      : gFromField != null && gFromField > 0
        ? String(gFromField)
        : "—";

  const unit = String(ln.unit || pickFieldStr(f, ["tani", "unit"]) || "").trim();
  out.H_单位 = unit || (out.H_单位 && out.H_单位.trim()) || "—";

  const tankaParsed = parseNumLoose(f.tanka) ?? (ln.unit_price != null && Number.isFinite(ln.unit_price) ? ln.unit_price : null);
  out.I_单价 = formatYen(tankaParsed);

  let amount = parseNumLoose(f.kingaku) ?? parseNumLoose(f.price) ?? parseNumLoose(f.gaku) ?? parseNumLoose(out.J_金额);
  if (amount == null && qtyParsed != null && tankaParsed != null && qtyParsed > 0 && tankaParsed > 0) {
    amount = Math.round(qtyParsed * tankaParsed);
  }
  out.J_金额 = formatYen(amount);

  const dParts = [pickFieldStr(f, ["taisho2"]), pickFieldStr(f, ["zumen_suryo"]), pickFieldStr(f, ["maker", "maker_name"])]
    .filter(Boolean);
  const typePart = pickFieldStr(f, ["type", "hinban", "hinban_cd", "hinban_text"]);
  if (typePart) dParts.push(typePart);
  const dBuilt = dParts.length ? dParts.join(" · ") : "";
  if (dBuilt) out.D_详细规格 = out.D_详细规格 ? `${out.D_详细规格} · ${dBuilt}` : dBuilt;
  if (!out.D_详细规格) out.D_详细规格 = "—";

  if (!String(out.B_施工内容 || "").trim()) out.B_施工内容 = "—";
  if (!String(out.F_部位 || "").trim()) out.F_部位 = "—";
  if (!String(out.K_备注原因 || "").trim()) out.K_备注原因 = "—";

  return out;
}
