/**
 * 原紙見積書・DB 突合わせ用の文字列正規化
 */

/** @param {string} s */
export function normalizeJaText(s) {
  let t = String(s ?? "").trim();
  if (!t) return "";
  try {
    t = t.normalize("NFKC");
  } catch {
    /* ignore */
  }
  return t
    .replace(/\u3000/g, " ")
    .replace(/[（(]量産品[）)]/g, "")
    .replace(/クロス貼替え/g, "クロス貼替")
    .replace(/クロス張替/g, "クロス貼替")
    .replace(/ｸﾛｽ貼替/g, "クロス貼替")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} s */
export function normalizeBasho(s) {
  return normalizeJaText(s)
    .replace(/・/g, "･")
    .replace(/\s/g, "");
}

/** @param {string} s */
export function normalizeBui(s) {
  const t = normalizeJaText(s);
  if (/天井/.test(t)) return "天井";
  if (/壁/.test(t)) return "壁";
  return t;
}

/** @param {string|number} v */
export function parseAmount(v) {
  const t = String(v ?? "")
    .trim()
    .replace(/[¥￥,\s]/g, "");
  if (!t || t === "—" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** @param {string} line */
export function splitTabColumns(line) {
  return String(line ?? "")
    .split(/\t/)
    .map((c) => c.trim());
}

/** @param {string} s */
export function isDimensionLine(s) {
  const t = normalizeJaText(s);
  if (!t) return false;
  if (/[※＊*]/.test(t)) return false;
  const parts = t.split(/[　\s]+/).filter(Boolean);
  if (!parts.length) return false;
  return parts.every((p) => /^\d+(?:\.\d+)?[×xX]\d+(?:\.\d+)?$/.test(p));
}

/** @param {string} s */
export function isCommentLine(s) {
  const t = String(s ?? "").trim();
  return /^[※＊*]/.test(t);
}

/** @param {string} s */
export function extractDimensions(s) {
  const t = normalizeJaText(s);
  return t.split(/[　\s]+/).filter((p) => /^\d+(?:\.\d+)?[×xX]\d+(?:\.\d+)?$/.test(p));
}
