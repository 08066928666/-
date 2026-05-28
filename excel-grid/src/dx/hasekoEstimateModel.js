/**
 * 長谷工「見積登録」テーブル用データモデル（AdminLTE Clone UI）
 */

export const UNIT_OPTIONS = ["", "式", "㎡", "ｍ", "箇所", "ヶ所", "本", "台", "個", "枚"];

/** 豊洲1415 想定デモ（HTML PoC 準拠） */
export const DEMO_ESTIMATE_ITEMS = [
  { id: 1, target: true, level: 1, name: "01 クロス貼替工事", spec: "", ceil: "", wall: "", qty: "", unit: "式", price: "", remark: "" },
  { id: 2, target: true, level: 3, name: "洋室 クロス貼替", spec: "SP9713", ceil: 10.4, wall: 21.6, qty: 32.0, unit: "㎡", price: 1000, remark: "標準品" },
  { id: 3, target: true, level: 1, name: "02 床工事", spec: "", ceil: "", wall: "", qty: "", unit: "式", price: "", remark: "" },
  { id: 4, target: true, level: 2, name: "フロアタイル 上張り", spec: "WD-2013", ceil: "", wall: "", qty: 15.6, unit: "㎡", price: 4500, remark: "" },
  { id: 5, target: true, level: 1, name: "10 設備機器交換工事", spec: "", ceil: "", wall: "", qty: "", unit: "式", price: "", remark: "" },
  { id: 6, target: true, level: 2, name: "キッチン水栓 本体", spec: "KM5011T", ceil: "", wall: "", qty: 1, unit: "台", price: 22000, remark: "材料" },
  { id: 7, target: true, level: 2, name: "キッチン水栓 施工費", spec: "", ceil: "", wall: "", qty: 1, unit: "式", price: 12000, remark: "工賃" },
  { id: 8, target: true, level: 2, name: "水栓 処分費", spec: "", ceil: "", wall: "", qty: 1, unit: "式", price: 3217, remark: "産廃" }
];

let _idSeq = 1000;
export function nextEstimateId() {
  _idSeq += 1;
  return _idSeq;
}

export function isItemTarget(item) {
  if (item.target === false) return false;
  if (item.selected === false) return false;
  return true;
}

export function newEstimateItem(patch = {}) {
  const on =
    patch.target !== undefined ? patch.target !== false : patch.selected !== undefined ? patch.selected !== false : true;
  return {
    id: patch.id ?? nextEstimateId(),
    target: on,
    level: Number(patch.level) || 2,
    name: String(patch.name ?? ""),
    spec: String(patch.spec ?? ""),
    ceil: patch.ceil === "" || patch.ceil == null ? "" : patch.ceil,
    wall: patch.wall === "" || patch.wall == null ? "" : patch.wall,
    qty: patch.qty === "" || patch.qty == null ? "" : patch.qty,
    unit: String(patch.unit ?? ""),
    price: patch.price === "" || patch.price == null ? "" : patch.price,
    remark: String(patch.remark ?? "")
  };
}

function parseNum(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function calcRowAmount(item) {
  if (item.level === 1) return 0;
  const calcQty =
    item.level === 3
      ? (parseFloat(item.ceil) || 0) + (parseFloat(item.wall) || 0)
      : parseFloat(item.qty) || 0;
  return Math.round(calcQty * (parseFloat(item.price) || 0));
}

export function computeEstimateTotals(items) {
  let subtotal = 0;
  for (const item of items) {
    if (isItemTarget(item) && item.level !== 1) subtotal += calcRowAmount(item);
  }
  const tax = Math.floor(subtotal * 0.1);
  return { subtotal, tax, grand: subtotal + tax };
}

export function toggleTargetItems(items, idx) {
  const next = items.map((i) => ({ ...i }));
  const newState = !isItemTarget(next[idx]);
  next[idx].target = newState;
  if (next[idx].level === 1) {
    for (let i = idx + 1; i < next.length; i++) {
      if (next[i].level === 1) break;
      next[i].target = newState;
    }
  }
  return next;
}

/** @deprecated use toggleTargetItems */
export const toggleCheckItems = toggleTargetItems;

export function parsedToEstimateItems(parsed) {
  const items = [];
  const blocks = parsed?.structurePreview || [];
  let sectionNum = 0;

  for (const b of blocks) {
    const kind = String(b.kind);
    const f = b.fields && typeof b.fields === "object" ? b.fields : {};

    if (kind === "1") {
      const name = String(b.line1 || f.koshu1_text || "").trim();
      if (name) items.push(newEstimateItem({ level: 1, name, target: true }));
      continue;
    }

    if (kind === "2") {
      sectionNum += 1;
      const name = String(b.line1 || f.koshu2_text || "").trim();
      if (!name) continue;
      const prefixed = /^\d{2}\s/.test(name) ? name : `${String(sectionNum).padStart(2, "0")} ${name}`;
      items.push(newEstimateItem({ level: 1, name: prefixed, target: true }));
      continue;
    }

    if (kind !== "3") continue;

    const name = String(f.taisho1 || f.koji_naiyo || b.line1 || "").trim();
    if (!name || /^(（工事コード欠落）|（品目なし）)$/.test(name)) continue;

    const unit = String(f.tani || "式").trim() || "式";
    const qty = parseNum(f.suryo);
    const price = parseNum(f.tanka);
    const isM2 = /㎡/.test(unit);
    const specParts = [f.taisho2, f.basho, f.bui].map((x) => String(x || "").trim()).filter(Boolean);
    const spec = specParts.join(" / ");

    if (isM2 && qty != null && qty > 0) {
      items.push(
        newEstimateItem({
          level: 3,
          name,
          spec,
          ceil: Math.round(qty * 0.35 * 10) / 10,
          wall: Math.round(qty * 0.65 * 10) / 10,
          qty,
          unit: "㎡",
          price: price ?? 0,
          remark: String(f.biko1 || f.biko2 || "").trim()
        })
      );
    } else {
      items.push(
        newEstimateItem({
          level: 2,
          name,
          spec,
          qty: qty ?? 1,
          unit,
          price: price ?? 0,
          remark: String(f.biko1 || f.biko2 || "").trim()
        })
      );
    }
  }

  if (items.length === 0 && Array.isArray(parsed?.masters)) {
    for (const m of parsed.masters) {
      const name = String(m.item_name || "").trim();
      if (!name) continue;
      items.push(
        newEstimateItem({
          level: 2,
          name,
          spec: String(m.basho || "").trim(),
          qty: Number(m.quantity) || 1,
          unit: String(m.unit || "式"),
          price: Number(m.unit_price) || 0
        })
      );
    }
  }

  return items;
}

export function extractHeaderLabel(parsed) {
  const estate = String(parsed?.estateName || "").trim();
  const room = String(parsed?.roomNo || "").trim();
  if (estate && room) return `${estate} ${room}`;
  const title = String(parsed?.constructionTitle || "").trim();
  const m = title.match(/(.+?)\s*(\d+号室)/);
  if (m) return `${m[1].replace(/見積登録\s*/g, "").trim()} ${m[2]}`;
  return title.replace(/見積登録\s*/g, "").trim() || "エスティメゾン豊洲レジデンスＡ棟 1415号室";
}
