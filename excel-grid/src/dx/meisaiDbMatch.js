/**
 * DB 側マスタとの突合（名前＋区分＋場所＋部位の類似度）
 * genbasho パイプライン（scripts/genbasho/meisaiDb.mjs）と同方針
 */

function normalizeLabel(s) {
  return String(s ?? "")
    .trim()
    .replace(/[　\s]+/g, "")
    .replace(/クロス貼替え/g, "クロス貼替")
    .replace(/ｸﾛｽ/g, "クロス")
    .replace(/ﾄｲﾚ/g, "トイレ");
}

function similarity(a, b) {
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
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * フラット明細を DB マスタと突合
 * @param {Array<object>} flat
 * @param {Array<object>} dbFirst
 * @param {{ threshold?: number }} opts
 */
export function snapCatalogMastersToDb(flat, dbFirst = [], opts = {}) {
  const list = Array.isArray(dbFirst) ? dbFirst : [];
  const threshold = opts.threshold ?? 0.78;
  if (!Array.isArray(flat)) return [];

  return flat.map((item) => {
    const k2 = String(item.koshu2_id ?? item.sel_koshu2_cd ?? "");
    const pool = list.filter((m) => String(m.koshu2_id ?? m.sel_koshu2_cd ?? "") === k2);

    let best = null;
    let bestScore = 0;
    for (const m of pool) {
      const bashoScore = similarity(item.basho, m.basho);
      const buiScore = similarity(item.bui, m.bui);
      const nameScore = similarity(item.item_name || item.taisho1, m.item_name || m.taisho1);
      const score = bashoScore * 0.5 + buiScore * 0.35 + nameScore * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    if (best && bestScore >= threshold) {
      return {
        ...item,
        id: best.id,
        koshu2_id: best.koshu2_id ?? item.koshu2_id,
        item_name: best.item_name ?? item.item_name,
        basho: best.basho ?? item.basho,
        bui: best.bui ?? item.bui,
        unit: best.unit ?? item.unit,
        unit_price: best.unit_price ?? item.unit_price,
        _matched: true,
        _match_score: Math.round(bestScore * 1000) / 1000,
        _source: "db"
      };
    }

    return {
      ...item,
      _needsDbInsert: Boolean(item.item_name || item.taisho1),
      _needs_review: true,
      _match_score: best ? Math.round(bestScore * 1000) / 1000 : 0,
      _source: "genbasho_rule"
    };
  });
}
