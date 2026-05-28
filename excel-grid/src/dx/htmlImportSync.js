/**
 * 未マッチ明細を API へ送信（プロトタイプ：実処理なしで成功を返す）
 * @param {unknown[]} rows
 * @param {{ signal?: AbortSignal }} _opts
 */
export async function insertUnmatchedCatalogRowsIntoDb(rows, _opts = {}) {
  const n = Array.isArray(rows) ? rows.length : 0;
  return { inserted: 0, failed: 0, skipped: n };
}
