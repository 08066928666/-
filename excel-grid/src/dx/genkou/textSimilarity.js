import { normalizeBasho, normalizeBui, normalizeJaText } from "./textNormalize.js";

/**
 * 0〜1 の類似度（簡易：完全一致→部分一致→文字集合 Jaccard）
 * @param {string} a
 * @param {string} b
 */
export function textSimilarity(a, b) {
  const x = normalizeJaText(a);
  const y = normalizeJaText(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;

  const sx = new Set([...x]);
  const sy = new Set([...y]);
  let inter = 0;
  for (const ch of sx) if (sy.has(ch)) inter += 1;
  const union = sx.size + sy.size - inter;
  const jaccard = union > 0 ? inter / union : 0;
  return jaccard;
}

/**
 * 明細行の突合スコア
 * @param {Record<string, unknown>} extracted
 * @param {Record<string, unknown>} dbEntry
 */
export function scoreMeisaiMatch(extracted, dbEntry) {
  const bashoScore = textSimilarity(extracted.basho, dbEntry.basho);
  const buiScore = textSimilarity(extracted.bui, dbEntry.bui);
  const itemScore = textSimilarity(
    extracted.taisho1 || extracted.item_name,
    dbEntry.taisho1 || dbEntry.item_name
  );
  const taniMatch = normalizeJaText(extracted.tani) === normalizeJaText(dbEntry.tani) ? 1 : 0.5;
  const tankaA = Number(extracted.tanka) || 0;
  const tankaB = Number(dbEntry.tanka ?? dbEntry.unit_price) || 0;
  const tankaScore =
    tankaA > 0 && tankaB > 0 ? (tankaA === tankaB ? 1 : 1 - Math.min(1, Math.abs(tankaA - tankaB) / Math.max(tankaA, tankaB))) : 0.6;

  const score =
    bashoScore * 0.35 + buiScore * 0.25 + itemScore * 0.25 + taniMatch * 0.05 + tankaScore * 0.1;

  return {
    score,
    bashoScore,
    buiScore,
    itemScore,
    taniMatch,
    tankaScore
  };
}

/**
 * @param {Record<string, unknown>} extracted
 * @param {Array<Record<string, unknown>>} candidates
 * @param {number} [minScore=0.72]
 */
export function findBestMeisaiMatch(extracted, candidates, minScore = 0.72) {
  const list = Array.isArray(candidates) ? candidates : [];
  let best = null;
  let bestScore = 0;
  let bestBreakdown = null;

  for (const c of list) {
    const br = scoreMeisaiMatch(extracted, c);
    if (br.score > bestScore) {
      bestScore = br.score;
      best = c;
      bestBreakdown = br;
    }
  }

  if (!best || bestScore < minScore) {
    return { hit: null, score: bestScore, breakdown: bestBreakdown };
  }
  return { hit: best, score: bestScore, breakdown: bestBreakdown };
}

/** @param {Record<string, unknown>} a @param {Record<string, unknown>} b */
export function meisaiFingerprint(a, b) {
  return [
    normalizeBasho(a.basho),
    normalizeBui(a.bui),
    normalizeJaText(a.taisho1 || a.item_name),
    normalizeJaText(a.tani)
  ].join("|||");
}
