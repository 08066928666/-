import { HASEKO_KOSHU2_SEED, normalizeKojiLabelText } from "./hasekoKoshu2Seed.js";

const SEED_BY_ID = new Map(HASEKO_KOSHU2_SEED.map((r) => [String(r.id), r]));

function shortFromLabel(label) {
  const t = normalizeKojiLabelText(String(label || "").replace(/（.*?）/g, "").replace(/\(.*?\)/g, ""));
  const noKoji = t.replace(/工事.*$/, "").trim();
  return noKoji.slice(0, 16) || t.slice(0, 12) || "明細";
}

/** HTML の長い表記から略称を作る。短縮できないときはシード略称、なければ文字切り詰めで label と差を付ける */
function deriveKoshu2TextForPatch(fullLabel, seed) {
  const label = normalizeKojiLabelText(String(fullLabel || "").trim());
  const fromRule = shortFromLabel(label);
  if (fromRule && fromRule !== label) return fromRule;
  const st = seed?.koshu2_text != null ? String(seed.koshu2_text).trim() : "";
  if (st && st !== label) return st;
  if (label.length > 6) return `${label.slice(0, 6)}…`;
  if (label.length > 2) return `${label.slice(0, Math.max(1, label.length - 1))}…`;
  return label || "明細";
}

/**
 * 長谷工見積 HTML の name="field[idx]" を収集（SELECT は value を優先）
 * @param {Document} doc
 */
function buildIndexedFieldMap(doc) {
  /** @type {Record<string, Record<string, string>>} */
  const dataMap = {};
  doc.querySelectorAll("input, select, textarea").forEach((el) => {
    const nameAttr = el.getAttribute("name") || "";
    const match = nameAttr.match(/^(\w+)\[(\d+)\]$/);
    if (!match) return;
    const field = match[1];
    const index = match[2];
    if (!dataMap[index]) dataMap[index] = {};

    let val = "";
    if (el.tagName === "SELECT") {
      val = String(el.value || el.options?.[el.selectedIndex]?.value || "").trim();
    } else {
      val = String(el.value ?? el.getAttribute("value") ?? "").trim();
    }
    dataMap[index][field] = val;
  });
  return dataMap;
}

/**
 * @typedef {{
 *   kind: "1" | "2" | "3" | "4",
 *   index: string,
 *   L_koshu2_cd?: string,
 *   line1?: string,
 *   line2?: string,
 *   fields: Record<string, string>
 * }} HtmlStructureBlock
 */

/**
 * row_kbn 1/2/3/4 構造の見積 HTML を解析（出現順のミニ構造 + マスタ行）。
 * @param {Document} doc
 * @returns {{
 *   detected: boolean,
 *   orderedBlocks: HtmlStructureBlock[],
 *   masters: Array<{ koshu2_id: string, item_name: string, unit: string, unit_price: number, basho: string, quantity: number }>,
 *   seedPatches: Array<{ id: string, label: string, koshu2_text: string }>,
 *   warnings: string[]
 * } | null}
 */
export function parseHtmlRowKbnStructured(doc) {
  const warnings = [];
  const dataMap = buildIndexedFieldMap(doc);
  const indices = Object.keys(dataMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const hasRowKbn = indices.some((idx) => String(dataMap[idx]?.row_kbn || "").trim());
  if (!hasRowKbn) return null;

  let currentKoshu1 = "";
  let currentKoshu2Cd = "";
  let currentKoshu2Text = "";
  let currentKoshu2CdHidden = "";
  const masters = [];
  const seen = new Set();
  /** @type {Map<string, { label: string, koshu2_text: string }>} */
  const patchByCd = new Map();
  /** @type {HtmlStructureBlock[]} */
  const orderedBlocks = [];

  for (const idx of indices) {
    const d = dataMap[idx];
    const kbn = String(d.row_kbn || "").trim();
    if (!kbn) continue;

    const fields = { ...d };

    if (kbn === "1") {
      currentKoshu1 = String(d.koshu1_text || "").trim();
      orderedBlocks.push({
        kind: "1",
        index: idx,
        line1: currentKoshu1 || "（大分類名なし）",
        fields
      });
      continue;
    }

    if (kbn === "2") {
      currentKoshu2Cd = String(d.sel_koshu2_cd || d.koshu2_cd || "").trim();
      currentKoshu2Text = String(d.koshu2_text || "").trim();
      currentKoshu2CdHidden = String(d.koshu2_cd || "").trim();
      if (currentKoshu2Cd) {
        const seed = SEED_BY_ID.get(currentKoshu2Cd);
        const raw = currentKoshu2Text || seed?.label || `工種 ${currentKoshu2Cd}`;
        const labelFromHtml = normalizeKojiLabelText(raw).slice(0, 200);
        patchByCd.set(currentKoshu2Cd, {
          label: labelFromHtml,
          koshu2_text: deriveKoshu2TextForPatch(labelFromHtml, seed)
        });
      }
      const seed = currentKoshu2Cd ? SEED_BY_ID.get(currentKoshu2Cd) : null;
      const line1Display = normalizeKojiLabelText(currentKoshu2Text) || seed?.label || `コード ${currentKoshu2Cd || "—"}`;
      orderedBlocks.push({
        kind: "2",
        index: idx,
        L_koshu2_cd: currentKoshu2Cd,
        line1: line1Display,
        line2: currentKoshu1 ? `大分類: ${currentKoshu1}` : "",
        fields
      });
      continue;
    }

    if (kbn === "4") {
      const comment = String(d.comment || "").trim();
      orderedBlocks.push({
        kind: "4",
        index: idx,
        line1: comment || "（コメント）",
        fields
      });
      continue;
    }

    if (kbn !== "3") continue;

    const cd = String((d.sel_koshu2_cd || currentKoshu2Cd || currentKoshu2CdHidden || "").trim());
    if (!cd || cd === "0") {
      warnings.push(`row_kbn=3 index=${idx}: 工事区分コードが空のためスキップ`);
      orderedBlocks.push({
        kind: "3",
        index: idx,
        L_koshu2_cd: "",
        line1: "（工事コード欠落）",
        line2: String(d.taisho1 || d.koji_naiyo || "").trim(),
        fields
      });
      continue;
    }

    const item_name = String(d.taisho1 || d.koji_naiyo || "").trim();
    const qtyRaw = String(d.suryo || "").replace(/,/g, "");
    const qty = Number(qtyRaw);
    const tankaRaw = String(d.tanka || "").replace(/,/g, "");
    const tanka = Number(tankaRaw);
    const tani = String(d.tani || "式").trim() || "式";
    const basho = String(d.basho || "").trim();

    orderedBlocks.push({
      kind: "3",
      index: idx,
      L_koshu2_cd: cd,
      line1: item_name || "（品目なし）",
      line2: [basho && `場所 ${basho}`, `数量 ${Number.isFinite(qty) && qty > 0 ? qty : "—"} ${tani}`, `単価 ${Number.isFinite(tanka) && tanka > 0 ? `¥${tanka.toLocaleString("ja-JP")}` : "—"}`]
        .filter(Boolean)
        .join(" · "),
      fields
    });

    if (!item_name) continue;

    const row = {
      koshu2_id: cd,
      item_name,
      unit: tani,
      unit_price: Number.isFinite(tanka) && tanka > 0 ? tanka : 0,
      basho,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1
    };
    const dedup = `${row.koshu2_id}|||${row.item_name}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    masters.push(row);
  }

  const seedPatches = [...patchByCd.entries()].map(([id, v]) => ({
    id: String(id),
    label: v.label,
    koshu2_text: v.koshu2_text
  }));

  if (!masters.length && !seedPatches.length) {
    warnings.push("row_kbn 構造は検出されましたが、明細(row_kbn=3)または工種行(row_kbn=2)が取り込めませんでした。");
  }

  return {
    detected: true,
    orderedBlocks,
    masters,
    seedPatches,
    warnings
  };
}
