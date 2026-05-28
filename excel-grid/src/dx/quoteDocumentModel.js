/**
 * 見積ドキュメントの共通モデル（テンプレ編集 ↔ 平板左工事/右明細 ↔ 見積書プレビュー/エクスポート）
 */
import { buildWorkPackagesFromOrderedBlocks } from "./htmlKojiWorkPackages.js";
import {
  newCostsRow,
  withComputedMeisai,
  isRowActive,
  computeCostsSummary,
  parsedToCostsRows
} from "./hasekoCostsModel.js";
import { normalizeItems } from "./hasekoDxV3/hasekoDxV3Workflow.js";
import { createRow, enrichRowForGrid } from "../exportUtils.js";
import { koshu2IdToCategoryId } from "./hasekoHtmlToGridRows.js";

/** @typedef {{
 *   id: string,
 *   active: boolean,
 *   item_name: string,
 *   basho: string,
 *   bui: string,
 *   koji_naiyo: string,
 *   quantity: number,
 *   unit: string,
 *   unit_price: number,
 *   lineKind: string,
 *   fields: Record<string, string>
 * }} QuoteLine */

/** @typedef {{
 *   id: string,
 *   active: boolean,
 *   koshu2Id: string,
 *   title: string,
 *   daiBunrui: string,
 *   lines: QuoteLine[],
 *   comments: Array<{ id: string, text: string, active: boolean }>
 * }} QuotePackage */

/** @typedef {{
 *   version: number,
 *   meta: { estateName?: string, roomNo?: string, workTitle?: string },
 *   packages: QuotePackage[]
 * }} QuoteDocument */

export function newQuoteId(prefix = "q") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyQuoteDocument(meta = {}) {
  return {
    version: 1,
    meta: {
      estateName: String(meta.estateName || ""),
      roomNo: String(meta.roomNo || ""),
      workTitle: String(meta.workTitle || "原状回復工事")
    },
    packages: []
  };
}

function lineAmount(line) {
  const q = Number(line.quantity) || 0;
  const p = Number(line.unit_price) || 0;
  return Math.round(q * p);
}

export function packageSubtotal(pkg) {
  if (!pkg?.active) return 0;
  let sum = 0;
  for (const ln of pkg.lines || []) {
    if (ln.active) sum += lineAmount(ln);
  }
  return sum;
}

export function documentSubtotal(doc) {
  let sum = 0;
  for (const pkg of doc?.packages || []) sum += packageSubtotal(pkg);
  return sum;
}

function normalizeLine(ln) {
  return {
    id: ln.id || newQuoteId("ln"),
    active: ln.active !== false,
    item_name: String(ln.item_name ?? ln.name ?? "").trim(),
    basho: String(ln.basho ?? "").trim(),
    bui: String(ln.bui ?? "").trim(),
    koji_naiyo: String(ln.koji_naiyo ?? "").trim(),
    quantity: Number(ln.quantity ?? ln.qty ?? 0) || 0,
    unit: String(ln.unit ?? "式").trim() || "式",
    unit_price: Number(ln.unit_price ?? ln.price ?? 0) || 0,
    lineKind: String(ln.lineKind ?? "main"),
    fields: ln.fields && typeof ln.fields === "object" ? { ...ln.fields } : {}
  };
}

function normalizePackage(pkg) {
  return {
    id: pkg.id || newQuoteId("pkg"),
    active: pkg.active !== false,
    koshu2Id: String(pkg.koshu2Id ?? "").trim(),
    title: String(pkg.title ?? "（工事）").trim() || "（工事）",
    daiBunrui: String(pkg.daiBunrui ?? "通常工事").trim() || "通常工事",
    lines: (pkg.lines || []).map(normalizeLine),
    comments: (pkg.comments || []).map((c) => ({
      id: c.id || newQuoteId("cmt"),
      text: String(c.text ?? "").trim(),
      active: c.active !== false
    }))
  };
}

export function normalizeQuoteDocument(doc) {
  if (!doc || typeof doc !== "object") return emptyQuoteDocument();
  return {
    version: 1,
    meta: {
      estateName: String(doc.meta?.estateName ?? ""),
      roomNo: String(doc.meta?.roomNo ?? ""),
      workTitle: String(doc.meta?.workTitle ?? "原状回復工事")
    },
    packages: (doc.packages || []).map(normalizePackage)
  };
}

/** DX V3 L1/L2/L3 → 工事パッケージ（左一覧）＋明細（右） */
export function dxItemsToQuoteDocument(items, meta = {}) {
  const doc = emptyQuoteDocument(meta);
  /** @type {QuotePackage | null} */
  let cur = null;

  const pushCur = () => {
    if (cur && (cur.lines.length > 0 || cur.title)) {
      doc.packages.push(cur);
    }
    cur = null;
  };

  for (const it of normalizeItems(items)) {
    if (it.type === "L1") {
      pushCur();
      cur = normalizePackage({
        id: it.id,
        active: it.active,
        koshu2Id: "",
        title: it.name,
        daiBunrui: "通常工事",
        lines: [],
        comments: []
      });
      continue;
    }
    if (!cur) {
      cur = normalizePackage({
        title: "（未分類工事）",
        daiBunrui: "通常工事",
        lines: [],
        comments: []
      });
    }
    let qty = Number(it.qty) || 0;
    if (it.type === "L3") {
      qty = (Number(it.ceilingM2) || 0) + (Number(it.wallM2) || 0);
    }
    cur.lines.push(
      normalizeLine({
        id: it.id,
        active: it.active,
        item_name: it.name,
        quantity: qty,
        unit: it.unit || (it.type === "L3" ? "㎡" : "式"),
        unit_price: Number(it.price) || 0,
        fields: {
          taisho1: it.name,
          suryo: String(qty),
          tani: it.unit || "式",
          tanka: String(it.price || 0)
        }
      })
    );
  }
  pushCur();
  return normalizeQuoteDocument(doc);
}

/** 見積 HTML 解析結果 → QuoteDocument */
export function parsedHtmlToQuoteDocument(parsed, meta = {}) {
  const blocks = parsed?.structurePreview || [];
  const wp = buildWorkPackagesFromOrderedBlocks(blocks);
  if (wp.length) {
    const doc = emptyQuoteDocument({
      estateName: parsed?.estateName || meta.estateName,
      roomNo: parsed?.roomNo || meta.roomNo,
      workTitle: parsed?.constructionTitle || meta.workTitle
    });
    doc.packages = wp.map((p) =>
      normalizePackage({
        id: p.id,
        active: true,
        koshu2Id: p.koshu2Id,
        title: p.title,
        daiBunrui: p.daiBunrui || "通常工事",
        lines: (p.lines || []).map((ln) =>
          normalizeLine({
            item_name: ln.item_name,
            basho: ln.basho,
            quantity: ln.quantity ?? 0,
            unit: ln.unit,
            unit_price: ln.unit_price ?? 0,
            lineKind: ln.lineKind,
            fields: ln.fields
          })
        ),
        comments: (p.comments || []).map((c) => ({ text: c.text, active: true }))
      })
    );
    return normalizeQuoteDocument(doc);
  }
  const costs = parsedToCostsRows(parsed);
  if (costs.length) return costsRowsToQuoteDocument(costs, meta);
  return emptyQuoteDocument(meta);
}

/** CostsRow[] → QuoteDocument */
export function costsRowsToQuoteDocument(rows, meta = {}) {
  const doc = emptyQuoteDocument(meta);
  let daiBunrui = "通常工事";
  /** @type {QuotePackage | null} */
  let cur = null;

  const pushCur = () => {
    if (cur) doc.packages.push(cur);
    cur = null;
  };

  for (const r of rows || []) {
    if (!isRowActive(r)) continue;
    const f = r.fields || {};
    if (r.row_kbn === "1") {
      daiBunrui = String(f.koshu1_text || "").trim() || "通常工事";
      continue;
    }
    if (r.row_kbn === "2") {
      pushCur();
      cur = normalizePackage({
        koshu2Id: String(f.sel_koshu2_cd || f.koshu2_cd || "").trim(),
        title: String(f.koshu2_text || "").trim() || "工事",
        daiBunrui,
        lines: [],
        comments: []
      });
      continue;
    }
    if (r.row_kbn === "4") {
      const text = String(f.comment || "").trim();
      if (!text) continue;
      if (!cur) cur = normalizePackage({ title: "（コメント）", daiBunrui, lines: [], comments: [] });
      cur.comments.push({ id: newQuoteId("cmt"), text, active: true });
      continue;
    }
    if (r.row_kbn !== "3") continue;
    const name = String(f.taisho1 || f.koji_naiyo || "").trim();
    if (!name) continue;
    if (!cur) cur = normalizePackage({ title: "（明細）", daiBunrui, lines: [], comments: [] });
    const qty = parseFloat(String(f.suryo || "0").replace(/,/g, "")) || 0;
    const tanka = parseFloat(String(f.tanka || "0").replace(/,/g, "")) || 0;
    cur.lines.push(
      normalizeLine({
        item_name: name,
        basho: String(f.basho || "").trim(),
        bui: String(f.bui || "").trim(),
        koji_naiyo: String(f.koji_naiyo || "").trim(),
        quantity: qty,
        unit: String(f.tani || "式").trim() || "式",
        unit_price: tanka,
        fields: { ...f }
      })
    );
  }
  pushCur();
  return normalizeQuoteDocument(doc);
}

/** QuoteDocument → DX V3 items（テンプレ保存用） */
export function quoteDocumentToDxItems(doc) {
  const items = [];
  for (const pkg of doc?.packages || []) {
    items.push({
      id: pkg.id,
      type: "L1",
      name: pkg.title,
      active: pkg.active,
      qty: 0,
      ceilingM2: 0,
      wallM2: 0,
      unit: "",
      price: 0
    });
    for (const ln of pkg.lines) {
      const isM2 = /[㎡]/u.test(ln.unit);
      if (isM2 && ln.quantity > 0) {
        items.push({
          id: ln.id,
          type: "L3",
          name: ln.item_name,
          active: pkg.active && ln.active,
          qty: ln.quantity,
          ceilingM2: Math.round(ln.quantity * 0.35 * 10) / 10,
          wallM2: Math.round(ln.quantity * 0.65 * 10) / 10,
          unit: ln.unit,
          price: ln.unit_price
        });
      } else {
        items.push({
          id: ln.id,
          type: "L2",
          name: ln.item_name,
          active: pkg.active && ln.active,
          qty: ln.quantity,
          ceilingM2: 0,
          wallM2: 0,
          unit: ln.unit,
          price: ln.unit_price
        });
      }
    }
  }
  return normalizeItems(items);
}

/** QuoteDocument → 長谷工 CostsRow（見積書プレビュー） */
export function quoteDocumentToCostsRows(doc) {
  /** @type {import('./hasekoCostsModel.js').CostsRow[]} */
  const rows = [];
  let lastDai = "";

  for (const pkg of doc?.packages || []) {
    if (!pkg.active) continue;
    const dai = pkg.daiBunrui || "通常工事";
    if (dai !== lastDai) {
      rows.push(newCostsRow("1", { fields: { koshu1_text: dai } }));
      lastDai = dai;
    }
    const cd = pkg.koshu2Id || "1";
    rows.push(
      newCostsRow("2", {
        fields: {
          sel_koshu2_cd: cd,
          koshu2_cd: cd,
          koshu2_text: pkg.title
        }
      })
    );
    for (const ln of pkg.lines) {
      if (!ln.active) continue;
      const fields = withComputedMeisai({
        taisho1: ln.item_name,
        koji_naiyo: ln.koji_naiyo,
        basho: ln.basho,
        bui: ln.bui,
        suryo: String(ln.quantity),
        tani: ln.unit,
        tanka: String(ln.unit_price),
        koshu2_cd: cd,
        sel_koshu2_cd: cd,
        ...(ln.fields || {})
      });
      rows.push(newCostsRow("3", { fields }));
    }
    for (const c of pkg.comments) {
      if (!c.active || !c.text) continue;
      rows.push(newCostsRow("4", { fields: { comment: c.text } }));
    }
  }
  return rows;
}

/** 平板・エクスポート用 grid 行 */
export function quoteDocumentToGridRows(doc) {
  const rows = [];
  for (const pkg of doc?.packages || []) {
    if (!pkg.active) continue;
    for (const ln of pkg.lines) {
      if (!ln.active) continue;
      const categoryId = koshu2IdToCategoryId(pkg.koshu2Id);
      rows.push(
        enrichRowForGrid(
          createRow({
            categoryId,
            taisho1: ln.item_name,
            koji_naiyo: ln.koji_naiyo,
            basho: ln.basho,
            bui: ln.bui,
            suryo: ln.quantity,
            tani: ln.unit,
            tanka: ln.unit_price
          })
        )
      );
    }
  }
  return rows;
}

export function quoteDocumentSummary(doc) {
  const costsRows = quoteDocumentToCostsRows(doc);
  return computeCostsSummary(costsRows);
}

export { computeCostsSummary, lineAmount };
