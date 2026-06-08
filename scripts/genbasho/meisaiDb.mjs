/**
 * システム見積 HTML から明細マスタ DB を構築・検索
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseHasekoHtmlFile, KOUSHU2_META } from "../lib/hasekoHtmlParse.mjs";
import { normalizeLabel, similarity, expandBashoAliases, parseNumber } from "./textUtils.mjs";

const SCHEMA_VERSION = 1;

function entryKey(fields) {
  const parts = [
    fields.sel_koshu2_cd,
    fields.kojikomoku_id,
    normalizeLabel(fields.basho),
    normalizeLabel(fields.bui),
    normalizeLabel(fields.taisho1)
  ];
  return crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

function dec(s) {
  const n = parseNumber(s);
  return n == null ? 0 : n;
}

function detailToEntry(d, sourceFile) {
  const f = d.fields;
  const id = entryKey(f);
  return {
    id,
    sel_koshu2_cd: f.sel_koshu2_cd,
    koshu2_text: f.koshu2_text,
    koshu1_text: f.koshu1_text,
    kojikomoku_id: f.kojikomoku_id,
    taisho1: f.taisho1,
    taisho2: f.taisho2 || "",
    koji_naiyo: f.koji_naiyo || "",
    basho: f.basho,
    bui: f.bui,
    tani: f.tani,
    tanka: dec(f.tanka),
    suryo_sample: dec(f.suryo),
    biko1: f.biko1 || "",
    maker: f.maker || "",
    type: f.type || "",
    basho_aliases: expandBashoAliases(f.basho),
    sources: [path.basename(sourceFile)]
  };
}

function mergeEntry(existing, incoming) {
  const sources = new Set([...(existing.sources || []), ...(incoming.sources || [])]);
  const aliases = new Set([...(existing.basho_aliases || []), ...(incoming.basho_aliases || [])]);
  return {
    ...existing,
    taisho1: existing.taisho1 || incoming.taisho1,
    tanka: existing.tanka || incoming.tanka,
    sources: [...sources],
    basho_aliases: [...aliases]
  };
}

/**
 * 複数 HTML から DB 構築
 * @param {string[]} htmlPaths
 */
export function buildMeisaiDbFromHtmlFiles(htmlPaths) {
  /** @type {Map<string, object>} */
  const byId = new Map();

  for (const p of htmlPaths) {
    if (!fs.existsSync(p)) continue;
    const parsed = parseHasekoHtmlFile(p);
    for (const d of parsed.details) {
      const entry = detailToEntry(d, p);
      const prev = byId.get(entry.id);
      byId.set(entry.id, prev ? mergeEntry(prev, entry) : entry);
    }
  }

  const entries = [...byId.values()].sort((a, b) => {
    const ka = `${a.sel_koshu2_cd}-${a.basho}-${a.bui}`;
    const kb = `${b.sel_koshu2_cd}-${b.basho}-${b.bui}`;
    return ka.localeCompare(kb, "ja");
  });

  const byKoshu2 = {};
  for (const e of entries) {
    const cd = e.sel_koshu2_cd || "0";
    if (!byKoshu2[cd]) {
      byKoshu2[cd] = {
        koshu2_cd: cd,
        label: KOUSHU2_META[cd]?.label || `工種${cd}`,
        categoryId: KOUSHU2_META[cd]?.categoryId || null,
        entry_ids: []
      };
    }
    byKoshu2[cd].entry_ids.push(e.id);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
    byKoshu2
  };
}

export function loadMeisaiDb(dbPath) {
  const raw = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(raw);
}

export function saveMeisaiDb(db, dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * 抽出明細を DB と突合
 * @param {object} extracted - extractor 出力
 * @param {object} db
 * @param {{ threshold?: number }} opts
 */
export function matchExtractedToDb(extracted, db, opts = {}) {
  const threshold = opts.threshold ?? 0.78;
  const entries = db.entries || [];
  const koshuCd = extracted.sel_koshu2_cd || "1";
  const pool = entries.filter((e) => String(e.sel_koshu2_cd) === String(koshuCd));

  const results = [];
  for (const row of extracted.rows || []) {
    const bashoNorm = normalizeLabel(row.basho);
    const buiNorm = normalizeLabel(row.bui);
    const aliases = expandBashoAliases(row.basho);

    let best = null;
    let bestScore = 0;

    for (const e of pool) {
      const bashoScore = Math.max(
        similarity(bashoNorm, e.basho),
        ...(e.basho_aliases || []).map((a) => similarity(bashoNorm, a)),
        ...aliases.map((a) => similarity(a, e.basho))
      );
      const buiScore = similarity(buiNorm, e.bui);
      const taishoScore = similarity(row.taisho1 || "", e.taisho1);
      const score = bashoScore * 0.5 + buiScore * 0.35 + taishoScore * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }

    if (best && bestScore >= threshold) {
      results.push({
        ...row,
        row_kbn: "3",
        matched: true,
        match_score: Math.round(bestScore * 1000) / 1000,
        db_entry_id: best.id,
        sel_koshu2_cd: best.sel_koshu2_cd,
        koshu1_text: best.koshu1_text,
        koshu2_text: best.koshu2_text,
        kojikomoku_id: best.kojikomoku_id,
        taisho1: best.taisho1,
        taisho2: best.taisho2,
        koji_naiyo: best.koji_naiyo || row.koji_naiyo || "",
        basho: best.basho,
        bui: best.bui,
        tani: best.tani || row.tani,
        tanka: row.tanka ?? best.tanka,
        suryo: row.suryo,
        kakaku: row.kakaku ?? (row.suryo && row.tanka ? Math.round(row.suryo * row.tanka) : null),
        biko1: row.biko1 || best.biko1,
        maker: row.maker || best.maker,
        type: row.type || best.type,
        _source: "db"
      });
    } else {
      results.push({
        ...row,
        row_kbn: "3",
        matched: false,
        match_score: best ? Math.round(bestScore * 1000) / 1000 : 0,
        _needs_review: true,
        _source: "genbasho_rule",
        sel_koshu2_cd: koshuCd,
        koshu1_text: extracted.koshu1_text || "通常工事",
        koshu2_text: extracted.koshu2_text || KOUSHU2_META[koshuCd]?.label || "",
        taisho1: row.taisho1 || extracted.default_taisho1 || "（要確認）",
        koji_naiyo: row.koji_naiyo || "",
        kakaku: row.kakaku ?? (row.suryo && row.tanka ? Math.round(row.suryo * row.tanka) : null)
      });
    }
  }

  const comments = (extracted.comments || []).map((c) => ({
    row_kbn: "4",
    comment: c.text,
    matched: false,
    _source: "genbasho_comment"
  }));

  return {
    section_title: extracted.title,
    hinban: extracted.hinban,
    sel_koshu2_cd: koshuCd,
    rows: results,
    comments,
    dimensions: extracted.dimensions || []
  };
}
