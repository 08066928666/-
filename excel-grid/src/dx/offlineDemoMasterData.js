import { formatKoshuLine } from "./hasekoKoshu2Seed.js";
import { mergeKoshuCategoriesForUi } from "./koshu2CatalogMerge.js";

/**
 * merge 済み categories からオフライン用 master-data を組み立て
 * @param {Array<{ id: string, name: string, label?: string, koshu2_text?: string }>} categories
 */
export function buildOfflineMasterDataFromCategories(categories) {
  const list = Array.isArray(categories) ? categories : [];
  let mid = 10001;
  const nextId = () => mid++;

  const masters = list.map((c) => {
    const sub = c.koshu2_text || "";
    const idStr = String(c.id);
    const sqm = ["1", "2", "8"].includes(idStr);
    return {
      id: nextId(),
      item_name: sub ? `${sub}（代表例）` : "明細（代表例）",
      koshu2_id: idStr,
      unit: sqm ? "㎡" : "式",
      unit_price: idStr === "10" ? 20000 : idStr === "1" ? 9000 : 5000
    };
  });

  return {
    ok: true,
    source: "offline-demo",
    categories: list.map((c) => ({
      id: String(c.id),
      name: c.name || formatKoshuLine(c),
      koshu2_text: c.koshu2_text,
      discontinued: c.discontinued
    })),
    masters
  };
}

export function buildOfflineMasterDataPayload() {
  const cats = mergeKoshuCategoriesForUi(null, true);
  return buildOfflineMasterDataFromCategories(cats);
}

export function buildOfflineStarterMeisaiRows() {
  return [
    { item_name: "総表サンプル・クロス", unit: "㎡", unit_price: 900, koshu2_id: "1", taisho1: "廊下" },
    { item_name: "総表サンプル・設備交換", unit: "式", unit_price: 20000, koshu2_id: "10", taisho1: "キッチン" }
  ];
}
