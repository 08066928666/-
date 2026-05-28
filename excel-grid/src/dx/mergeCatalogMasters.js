function keyOf(m) {
  if (m == null || typeof m !== "object") return null;
  if (Number.isFinite(Number(m.id))) return `id:${m.id}`;
  const nm = String(m.item_name || "").trim();
  const k2 = String(m.koshu2_id ?? "");
  if (nm) return `${k2}|||${nm}`;
  return null;
}

export function appendCatalogDeduped(base = [], extra = []) {
  const out = [...(Array.isArray(base) ? base : [])];
  const seen = new Set();
  for (const x of out) {
    const k = keyOf(x);
    if (k) seen.add(k);
  }
  for (const m of Array.isArray(extra) ? extra : []) {
    const k = keyOf(m);
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    out.push(m);
  }
  return out;
}
