/**
 * 原紙見積テキストの正規化・類似度
 */

/** 全角→半角、空白除去、表記ゆれ統一 */
export function normalizeLabel(s) {
  return String(s ?? "")
    .trim()
    .replace(/[　\s]+/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/クロス貼替え/g, "クロス貼替")
    .replace(/ｸﾛｽ/g, "クロス")
    .replace(/ﾄｲﾚ/g, "トイレ")
    .replace(/洗面所/g, "洗面")
    .replace(/・/g, "")
    .replace(/[／/]/g, "");
}

/** 場所名のゆれを吸収（DB 突合用） */
const BASHO_ALIASES = new Map([
  ["洗面トイレ", ["洗面ﾄｲﾚ", "洗面所", "洗面", "トイレ", "洗面所トイレ"]],
  ["玄関廊下", ["玄関・廊下", "玄関", "廊下", "玄関キッチン"]],
  ["洋室", ["洋室1", "洋室2", "寝室"]],
  ["洗濯室", ["洗濯", "ランドリー"]],
  ["ＬＤＫ", ["LDK", "リビング", "居間"]]
]);

export function expandBashoAliases(basho) {
  const n = normalizeLabel(basho);
  const out = new Set([n, String(basho ?? "").trim()]);
  for (const [canonical, aliases] of BASHO_ALIASES) {
    const cn = normalizeLabel(canonical);
    if (n === cn || aliases.some((a) => normalizeLabel(a) === n)) {
      out.add(cn);
      for (const a of aliases) out.add(normalizeLabel(a));
    }
  }
  return [...out].filter(Boolean);
}

export function parseNumber(s) {
  const t = String(s ?? "")
    .trim()
    .replace(/[,，\s]/g, "")
    .replace(/[㎡m²]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 行をタブ優先でセル分割（Excel コピー対応） */
export function splitRowCells(line) {
  const raw = String(line ?? "").replace(/\r$/, "");
  if (raw.includes("\t")) return raw.split("\t").map((c) => c.trim());
  return raw.split(/\s{2,}/).map((c) => c.trim()).filter((c, i, arr) => c || i < arr.length);
}

/** 寸法行か（2.1×3.45 等） */
export function isDimensionLine(line) {
  const t = String(line ?? "").trim();
  if (!t) return false;
  if (/※/.test(t)) return false;
  const dims = t.match(/\d+\.?\d*\s*[×xX＊]\s*\d+\.?\d*/g);
  return Boolean(dims && dims.length >= 1 && !/[㎡式台箇所]/.test(t));
}

/** コメント行（※ 始まり、単価数量なし） */
export function isCommentLine(line) {
  const t = String(line ?? "").trim();
  return /^※/.test(t);
}

/** タイトル行（先頭番号 + 工事名） */
export function isTitleLine(line) {
  const t = String(line ?? "").trim();
  return /^\d+[\s　]/.test(t) && /工事/.test(t);
}

/** 明細行：単位・数量・単価・合計が揃っている */
export function isMeisaiLine(cells) {
  const joined = cells.join(" ");
  if (!/[㎡式台箇所ｍ]/.test(joined)) return false;
  const nums = cells.map(parseNumber).filter((n) => n != null);
  if (nums.length < 3) return false;
  const hasUnit = cells.some((c) => /^(㎡|式|台|箇所|ｍ|m)$/i.test(String(c).trim()));
  return hasUnit;
}

/** レーベンシュタイン距離ベース類似度 0–1 */
export function similarity(a, b) {
  const s = normalizeLabel(a);
  const t = normalizeLabel(b);
  if (!s && !t) return 1;
  if (!s || !t) return 0;
  if (s === t) return 1;
  if (s.includes(t) || t.includes(s)) return 0.92;

  const m = s.length;
  const n = t.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

export function extractHinban(text) {
  const m = String(text ?? "").match(/\b([A-Z]{1,4}\d{3,6}[A-Z]?)\b/);
  return m ? m[1] : "";
}
