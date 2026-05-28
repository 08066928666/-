/** @param {{ _needsDbInsert?: boolean }[]} snap */
export function listCatalogRowsNeedingInsert(snap) {
  if (!Array.isArray(snap)) return [];
  return snap.filter((r) => r && r._needsDbInsert === true && String(r.item_name || "").trim());
}

/**
 * 巡検向けプリセット（プロトタイプ用プレースホルダ）。
 */
export function buildInspectionPresetFromSnap(snap, merged) {
  return {
    version: 1,
    snapped: Array.isArray(snap) ? snap : [],
    mergedCount: Array.isArray(merged) ? merged.length : 0,
    hints: "HTML 取込から生成したプリセット（プロトタイプ）"
  };
}
