/**
 * 明細総表行を見積マスタ案のフラット一覧へ（簡略版）
 * @param {unknown[]} rows
 */
export function flattenMeisaiSheetToMasters(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && typeof r === "object" && !Array.isArray(r))
    .map((r, i) => ({
      id: r.id ?? `catalog-${i}`,
      item_name: String(r.item_name ?? r.taisho1 ?? r.name ?? "").trim(),
      unit: String(r.unit ?? r.tani ?? ""),
      unit_price: Number(r.unit_price ?? r.tanka ?? 0) || 0,
      koshu2_id: r.koshu2_id ?? r.categoryId ?? ""
    }))
    .filter((m) => m.item_name);
}
