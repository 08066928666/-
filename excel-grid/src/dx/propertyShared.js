export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtYen(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? `¥${v.toLocaleString("ja-JP")}` : "¥0";
}

export const STATUS_MAP = {
  pending: { label: "未着手", color: "bg-slate-100 text-slate-500" },
  draft: { label: "作成中", color: "bg-amber-100 text-amber-700" },
  done: { label: "完了", color: "bg-emerald-100 text-emerald-700" }
};

export function newId() {
  return "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}
