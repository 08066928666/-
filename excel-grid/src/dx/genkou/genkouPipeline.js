/**
 * 原紙見積書処理パイプライン
 * 原紙テキスト → 抽出 → DB 突合 → RPA 出力
 */
import { buildMeisaiDatabase, matchExtractedToDatabase } from "./meisaiDatabase.js";
import { parseGenkouByKoshu } from "./parsers/registry.js";
import { matchedMeisaiToRpaRows, matchedMeisaiToRowKbn, rpaRowsToCsv } from "./rpaExport.js";

/**
 * @param {string} genkouText 原紙見積書テキスト
 * @param {ReturnType<typeof buildMeisaiDatabase>} db
 * @param {{ koshu?: string, minScore?: number }} [opts]
 */
export function processGenkouText(genkouText, db, opts = {}) {
  const koshu = opts.koshu || "cross";
  const parsed = parseGenkouByKoshu(koshu, genkouText);

  /** @type {Array<Record<string, unknown>>} */
  const allMatched = [];
  /** @type {Array<Record<string, unknown>>} */
  const allComments = [];
  /** @type {Array<Record<string, unknown>>} */
  const allDimensions = [];
  /** @type {Array<Record<string, unknown>>} */
  const sectionResults = [];

  const sections = parsed.mode === "all" ? parsed.sections : [parsed];

  for (const section of sections) {
    const extracted = section.meisai || [];
    const matched = extracted.map((row) =>
      matchExtractedToDatabase(row, db, { minScore: opts.minScore })
    );
    allMatched.push(...matched);
    allComments.push(...(section.comments || []));
    allDimensions.push(...(section.dimensions || []));

    const rowKbn = matchedMeisaiToRowKbn(matched, section.comments, {
      koshu2Id: section.koshu2Id,
      title: section.title
    });

    sectionResults.push({
      koshuKey: section.koshuKey || koshu,
      koshu2Id: section.koshu2Id,
      title: section.title,
      hinban: section.hinban,
      stats: section.stats,
      extractedCount: extracted.length,
      dbHitCount: matched.filter((m) => m._matchStatus === "db_hit").length,
      newCount: matched.filter((m) => m._matchStatus === "formatted_new").length,
      matched,
      rowKbn
    });
  }

  const rpaRows = matchedMeisaiToRpaRows(allMatched);
  const rpaCsv = rpaRowsToCsv(rpaRows);

  return {
    schemaVersion: 1,
    processedAt: new Date().toISOString(),
    koshu,
    parsed,
    sections: sectionResults,
    summary: {
      totalMeisai: allMatched.length,
      dbHits: allMatched.filter((m) => m._matchStatus === "db_hit").length,
      newFormatted: allMatched.filter((m) => m._matchStatus === "formatted_new").length,
      needsReview: allMatched.filter((m) => m._needsReview).length,
      comments: allComments.length,
      dimensions: allDimensions.length
    },
    matchedMeisai: allMatched,
    comments: allComments,
    dimensions: allDimensions,
    rpa_rows: rpaRows,
    rpa_csv: rpaCsv,
    row_kbn_all: sectionResults.flatMap((s) => s.rowKbn)
  };
}

export { buildMeisaiDatabase, matchExtractedToDatabase, parseGenkouByKoshu };
