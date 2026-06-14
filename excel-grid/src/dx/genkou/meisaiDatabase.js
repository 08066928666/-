/**
 * システム出力見積（HTML）から明細マスタ DB を構築・検索
 */
import { HASEKO_KOSHU2_SEED } from "../hasekoKoshu2Seed.js";
import { parseHasekoHtmlToKojiAndMeisai } from "../htmlKojiParse.js";
import { normalizeBasho, normalizeBui, normalizeJaText, parseAmount } from "./textNormalize.js";
import { findBestMeisaiMatch, meisaiFingerprint } from "./textSimilarity.js";

const SEED_BY_ID = new Map(HASEKO_KOSHU2_SEED.map((r) => [String(r.id), r]));

function hashKey(parts) {
  return parts.filter(Boolean).join("|||");
}

/**
 * @param {Record<string, string>} fields
 * @param {string} koshu2Id
 * @param {string} source
 */
function fieldsToMeisaiEntry(fields, koshu2Id, source) {
  const taisho1 = normalizeJaText(fields.taisho1 || fields.koji_naiyo || "");
  const basho = normalizeBasho(fields.basho || "");
  const bui = normalizeBui(fields.bui || "");
  const tani = normalizeJaText(fields.tani || "式") || "式";
  const suryo = parseAmount(fields.suryo);
  const tanka = parseAmount(fields.tanka);
  const kakaku = parseAmount(fields.kakaku);

  return {
    id: hashKey([koshu2Id, taisho1, basho, bui, tani, String(tanka ?? "")]),
    koshu2_id: String(koshu2Id || ""),
    kojikomoku_id: String(fields.kojikomoku_id || "").trim(),
    taisho1,
    taisho2: normalizeJaText(fields.taisho2 || ""),
    koji_naiyo: normalizeJaText(fields.koji_naiyo || ""),
    basho,
    bui,
    tani,
    suryo: suryo ?? 0,
    tanka: tanka ?? 0,
    kakaku: kakaku ?? (suryo != null && tanka != null ? Math.round(suryo * tanka) : 0),
    biko1: normalizeJaText(fields.biko1 || fields.biko2 || ""),
    maker: normalizeJaText(fields.maker || ""),
    type: normalizeJaText(fields.type || ""),
    item_name: taisho1,
    unit: tani,
    unit_price: tanka ?? 0,
    frequency: 1,
    sources: [source]
  };
}

/**
 * HTML 1件から明細エントリを抽出
 * @param {string} html
 * @param {string} sourceLabel
 */
export function extractMeisaiFromHtml(html, sourceLabel = "unknown") {
  const parsed = parseHasekoHtmlToKojiAndMeisai(html);
  const blocks = (parsed?.structurePreview || []).filter((b) => String(b.kind) === "3");
  /** @type {Array<ReturnType<typeof fieldsToMeisaiEntry>>} */
  const entries = [];

  for (const b of blocks) {
    const f = b.fields && typeof b.fields === "object" ? b.fields : {};
    const cd = String(b.L_koshu2_cd || f.sel_koshu2_cd || f.koshu2_cd || "").trim();
    const item = normalizeJaText(f.taisho1 || f.koji_naiyo || b.line1 || "");
    if (!cd || !item || /（品目なし）|（工事コード欠落）/.test(item)) continue;
    entries.push(fieldsToMeisaiEntry(f, cd, sourceLabel));
  }

  return {
    meta: {
      estateName: parsed?.estateName || "",
      roomNo: parsed?.roomNo || "",
      constructionTitle: parsed?.constructionTitle || ""
    },
    entries
  };
}

/**
 * 複数 HTML から DB を構築（同一キーは frequency を加算）
 * @param {Array<{ html: string, source: string }>} sources
 */
export function buildMeisaiDatabase(sources) {
  /** @type {Map<string, ReturnType<typeof fieldsToMeisaiEntry>>} */
  const byId = new Map();
  /** @type {Record<string, { label: string, entries: ReturnType<typeof fieldsToMeisaiEntry>[] }>} */
  const byKoshu2 = {};

  for (const src of sources || []) {
    const { entries } = extractMeisaiFromHtml(src.html, src.source);
    for (const e of entries) {
      const existing = byId.get(e.id);
      if (existing) {
        existing.frequency += 1;
        if (!existing.sources.includes(src.source)) existing.sources.push(src.source);
        if (!existing.kojikomoku_id && e.kojikomoku_id) existing.kojikomoku_id = e.kojikomoku_id;
      } else {
        byId.set(e.id, { ...e });
      }
    }
  }

  for (const e of byId.values()) {
    const cd = e.koshu2_id || "0";
    if (!byKoshu2[cd]) {
      const seed = SEED_BY_ID.get(cd);
      byKoshu2[cd] = { label: seed?.label || `工種${cd}`, entries: [] };
    }
    byKoshu2[cd].entries.push(e);
  }

  for (const bucket of Object.values(byKoshu2)) {
    bucket.entries.sort((a, b) => b.frequency - a.frequency || a.basho.localeCompare(b.basho, "ja"));
  }

  return {
    version: 1,
    builtAt: new Date().toISOString(),
    sourceCount: (sources || []).length,
    entryCount: byId.size,
    byKoshu2
  };
}

/** @param {ReturnType<typeof buildMeisaiDatabase>} db @param {string} koshu2Id */
export function getDbEntriesForKoshu(db, koshu2Id) {
  const cd = String(koshu2Id || "");
  return db?.byKoshu2?.[cd]?.entries || [];
}

/**
 * 抽出明細を DB と突合し、ヒット時は DB 値で置換
 * @param {Record<string, unknown>} extracted
 * @param {ReturnType<typeof buildMeisaiDatabase>} db
 * @param {{ minScore?: number }} [opts]
 */
export function matchExtractedToDatabase(extracted, db, opts = {}) {
  const koshu2Id = String(extracted.koshu2_id || extracted.koshu2Id || "");
  const candidates = getDbEntriesForKoshu(db, koshu2Id);
  const { hit, score, breakdown } = findBestMeisaiMatch(extracted, candidates, opts.minScore ?? 0.72);

  if (hit) {
    return {
      ...hit,
      suryo: extracted.suryo ?? hit.suryo,
      kakaku:
        extracted.kakaku ??
        (Number(extracted.suryo) && Number(hit.tanka)
          ? Math.round(Number(extracted.suryo) * Number(hit.tanka))
          : hit.kakaku),
      type: extracted.type || extracted.hinban || hit.type,
      _matchStatus: "db_hit",
      _confidence: score,
      _matchBreakdown: breakdown,
      _sourceFingerprint: meisaiFingerprint(extracted, hit)
    };
  }

  return {
    koshu2_id: koshu2Id,
    taisho1: normalizeJaText(extracted.taisho1 || extracted.item_name || "クロス貼替"),
    taisho2: normalizeJaText(extracted.taisho2 || ""),
    koji_naiyo: normalizeJaText(extracted.koji_naiyo || ""),
    basho: normalizeBasho(extracted.basho || ""),
    bui: normalizeBui(extracted.bui || ""),
    tani: normalizeJaText(extracted.tani || "㎡") || "㎡",
    suryo: Number(extracted.suryo) || 0,
    tanka: Number(extracted.tanka) || 0,
    kakaku: Number(extracted.kakaku) || 0,
    biko1: normalizeJaText(extracted.biko1 || ""),
    maker: normalizeJaText(extracted.maker || ""),
    type: normalizeJaText(extracted.type || extracted.hinban || ""),
    kojikomoku_id: "",
    _matchStatus: "formatted_new",
    _confidence: score,
    _needsReview: true,
    _matchBreakdown: breakdown
  };
}
