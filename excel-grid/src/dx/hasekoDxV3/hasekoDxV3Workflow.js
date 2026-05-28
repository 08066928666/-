/**
 * Haseko DX Smart Workflow V3.0 — データ・計算・永続化
 * Phase1 MAX テンプレ / Phase2 現場「減法」ロジック削除（論理削除）
 */
import { CATEGORY_DEFS, HASEKO_STANDARD_TEMPLATE } from "../../constants.js";

export const STORAGE_KEY = "haseko-dx-v3-db";
export const TAX_RATE = 0.1;

export function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @typedef {"L1"|"L2"|"L3"} DxItemType */
/**
 * @typedef {{
 *   id: string,
 *   type: DxItemType,
 *   name: string,
 *   active: boolean,
 *   qty: number,
 *   ceilingM2: number,
 *   wallM2: number,
 *   unit: string,
 *   price: number
 * }} DxLineItem
 */

/** L2: qty×単価。L3: (天井㎡+壁㎡)×単価（㎡単価）。L1 は集計対象外 */
export function calculateLineAmount(item) {
  if (!item || item.type === "L1") return 0;
  if (item.type === "L3") {
    const m2 = (Number(item.ceilingM2) || 0) + (Number(item.wallM2) || 0);
    return Math.round(m2 * (Number(item.price) || 0));
  }
  return Math.round((Number(item.qty) || 0) * (Number(item.price) || 0));
}

export function computeTotals(items) {
  let subtotal = 0;
  for (const it of items || []) {
    if (!it.active || it.type === "L1") continue;
    subtotal += calculateLineAmount(it);
  }
  const tax = Math.floor(subtotal * TAX_RATE);
  const grand = subtotal + tax;
  return { subtotal, tax, grand };
}

/** L1 チェック連動：同一 L1 配下の L2/L3 まで次の L1 手前まで active を同期 */
export function toggleCategoryActive(items, idx) {
  const next = (items || []).map((x) => ({ ...x }));
  if (!next[idx] || next[idx].type !== "L1") return next;
  const newState = !next[idx].active;
  next[idx].active = newState;
  for (let i = idx + 1; i < next.length; i++) {
    if (next[i].type === "L1") break;
    next[i].active = newState;
  }
  return next;
}

export function toggleRowActive(items, idx) {
  const next = (items || []).map((x) => ({ ...x }));
  if (!next[idx]) return next;
  next[idx].active = !next[idx].active;
  return next;
}

function normalizeItem(it) {
  return {
    id: it.id || newId("row"),
    type: it.type === "L2" || it.type === "L3" ? it.type : "L1",
    name: String(it.name ?? ""),
    active: it.active !== false,
    qty: Number(it.qty ?? 0) || 0,
    ceilingM2: Number(it.ceilingM2 ?? 0) || 0,
    wallM2: Number(it.wallM2 ?? 0) || 0,
    unit: String(it.unit ?? ""),
    price: Number(it.price ?? 0) || 0
  };
}

export function normalizeItems(arr) {
  return (arr || []).map(normalizeItem);
}

/** 長谷工標準テンプレ（constants）から MAX 工事リストを生成：工種ごとに L1、クロス系は L3 面積分割 */
export function buildMaxTemplateFromHasekoStandard() {
  const items = [];
  let lastCat = null;
  for (const row of HASEKO_STANDARD_TEMPLATE) {
    if (row.categoryId !== lastCat) {
      const def = CATEGORY_DEFS.find((c) => c.id === row.categoryId);
      items.push(
        normalizeItem({
          id: newId("L1"),
          type: "L1",
          name: `${def?.label ?? row.categoryId}（MAX）`,
          active: true,
          qty: 0,
          unit: "",
          price: 0
        })
      );
      lastCat = row.categoryId;
    }
    const name = String(row.taisho1 || "").trim() || "（名称なし）";
    if (row.categoryId === "wallpaper") {
      const total = Number(row.suryo) || 0;
      items.push(
        normalizeItem({
          id: newId("L3"),
          type: "L3",
          name,
          active: true,
          qty: total,
          ceilingM2: Math.round(total * 0.35 * 10) / 10,
          wallM2: Math.round(total * 0.65 * 10) / 10,
          unit: row.tani || "㎡",
          price: Number(row.tanka) || 0
        })
      );
    } else {
      items.push(
        normalizeItem({
          id: newId("L2"),
          type: "L2",
          name,
          active: true,
          qty: Number(row.suryo) || 0,
          unit: row.tani || "式",
          price: Number(row.tanka) || 0
        })
      );
    }
  }
  return items;
}

export function defaultDatabase() {
  return {
    version: 3,
    properties: [
      {
        id: "p1",
        name: "アーデン清澄白河",
        rooms: [{ id: "r1", name: "307", items: [], total: 0 }]
      }
    ],
    templates: [
      {
        id: "tpl_base",
        name: "1K 標準フルセット（デモ）",
        items: normalizeItems([
          { type: "L1", name: "01 クロス貼替工事", active: true },
          { type: "L3", name: "洋室 クロス貼替", qty: 32, ceilingM2: 12, wallM2: 20, unit: "㎡", price: 1000, active: true },
          { type: "L2", name: "巾木 入替", qty: 18, unit: "ｍ", price: 900, active: true }
        ])
      }
    ]
  };
}

export function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDatabase();
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return defaultDatabase();
    const props = Array.isArray(o.properties) ? o.properties : defaultDatabase().properties;
    const templates = Array.isArray(o.templates) ? o.templates : defaultDatabase().templates;
    return {
      version: 3,
      properties: props.map((p) => ({
        id: String(p.id || newId("p")),
        name: String(p.name || "物件"),
        rooms: (Array.isArray(p.rooms) ? p.rooms : []).map((r) => ({
          id: String(r.id || newId("r")),
          name: String(r.name || ""),
          items: normalizeItems(r.items),
          quoteDoc: r.quoteDoc && typeof r.quoteDoc === "object" ? r.quoteDoc : null,
          total: Number(r.total) || 0
        }))
      })),
      templates: templates.map((t) => ({
        id: String(t.id || newId("tpl")),
        name: String(t.name || "テンプレート"),
        items: normalizeItems(t.items),
        quoteDoc: t.quoteDoc && typeof t.quoteDoc === "object" ? t.quoteDoc : null
      }))
    };
  } catch {
    return defaultDatabase();
  }
}

export function saveDatabase(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export function deepCloneItems(items) {
  return JSON.parse(JSON.stringify(items || []));
}
