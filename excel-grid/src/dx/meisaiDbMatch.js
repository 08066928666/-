/**
 * DB 側マスタとの突合わせに相当する処理（名前＋区分で寄せる・不足はフラグのみ）
 */
export function snapCatalogMastersToDb(flat, dbFirst = []) {
  const list = Array.isArray(dbFirst) ? dbFirst : [];
  if (!Array.isArray(flat)) return [];
  return flat.map((item) => {
    const nm = String(item.item_name || "");
    const k2 = item.koshu2_id ?? "";
    const hit =
      nm &&
      list.find(
        (m) =>
          String(m.item_name || "") === nm && String(m.koshu2_id ?? "") === String(k2)
      );
    if (hit && hit.id != null) {
      return { ...item, id: hit.id, koshu2_id: hit.koshu2_id ?? item.koshu2_id };
    }
    return { ...item, _needsDbInsert: Boolean(nm) };
  });
}
