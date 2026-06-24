/**
 * 原紙見積テキスト → SimpleQuoteEditor セクション（ブラウザ用）
 */
import { extractAllSections } from "../../../../scripts/genbasho/extractors/index.mjs";
import { normalizeLabel, similarity, expandBashoAliases } from "../../../../scripts/genbasho/textUtils.mjs";
import meisaiDb from "../../../../scripts/genbasho/data/meisai_db.json";

const KOUSHU2_META = {
  "1": { label: "クロス工事" },
  "2": { label: "床工事" },
  "3": { label: "建具工事" }
};

function newId(prefix = "id") {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
}

function matchExtractedToDb(extracted, db, opts = {}) {
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
        matched: true,
        match_score: Math.round(bestScore * 1000) / 1000,
        basho: best.basho || row.basho,
        bui: best.bui || row.bui,
        tani: best.tani || row.tani,
        tanka: row.tanka ?? best.tanka,
        type: row.type || best.type,
        biko1: row.biko1 || best.biko1,
        _source: "db"
      });
    } else {
      results.push({
        ...row,
        matched: false,
        match_score: best ? Math.round(bestScore * 1000) / 1000 : 0,
        _needs_review: true,
        _source: "genbasho_rule",
        taisho1: row.taisho1 || extracted.default_taisho1 || "（要確認）"
      });
    }
  }

  const comments = (extracted.comments || []).map((c) => ({
    text: c.text,
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

function rowsToHarikaeLines(rows, hinban) {
  /** @type {Map<string, object>} */
  const byBasho = new Map();

  for (const r of rows) {
    const basho = (r.basho || "（未特定）").trim();
    if (!byBasho.has(basho)) {
      byBasho.set(basho, {
        basho,
        taisho1: "",
        taisho2: "",
        teika: r.tanka || 0,
        hinban: r.type || hinban || "",
        biko: r.biko1 || "",
        tani: r.tani || "㎡",
        matched: r.matched,
        _needs_review: r._needs_review
      });
    }
    const line = byBasho.get(basho);
    const bui = normalizeLabel(r.bui);
    if (bui.includes("天井")) line.taisho1 = r.suryo ?? line.taisho1;
    else if (bui.includes("壁")) line.taisho2 = r.suryo ?? line.taisho2;
    else line.taisho2 = r.suryo ?? line.taisho2;
    if (r.tanka) line.teika = r.tanka;
    if (r.type) line.hinban = r.type;
    if (r.matched === false) line._needs_review = true;
  }

  return [...byBasho.values()];
}

function matchedToSection(matched, kojiType = "harikae") {
  const lines = rowsToHarikaeLines(matched.rows, matched.hinban).map((r) => ({
    id: newId("ln"),
    type: "detail",
    lineType: kojiType,
    active: true,
    basho: r.basho,
    taisho1: r.taisho1 === "" ? "" : Number(r.taisho1),
    taisho2: r.taisho2 === "" ? "" : Number(r.taisho2),
    koji_naiyo: "",
    bui: "",
    suryo: (Number(r.taisho1) || 0) + (Number(r.taisho2) || 0),
    tani: r.tani || "㎡",
    maker: "",
    hinban: r.hinban || "",
    teika: Number(r.teika) || 0,
    biko: r.biko || "",
    _genbasho: { matched: r.matched !== false, needsReview: !!r._needs_review }
  }));

  const commentLines = (matched.comments || []).map((c) => ({
    id: newId("cmt"),
    type: "comment",
    text: c.text || "",
    active: true
  }));

  const sectionName =
    kojiType === "harikae"
      ? (matched.section_title || "クロス張替工事").replace(/貼替/g, "張替")
      : matched.section_title || "工事";

  return {
    id: newId("sec"),
    name: sectionName,
    kojiType,
    lines: [...lines, ...commentLines].length > 0 ? [...lines, ...commentLines] : [{ id: newId("ln"), type: "detail", lineType: kojiType, active: true, basho: "", taisho1: "", taisho2: "", koji_naiyo: "", bui: "", suryo: 0, tani: "㎡", maker: "", hinban: matched.hinban || "", teika: 0, biko: "" }],
    _genbasho: {
      hinban: matched.hinban,
      sel_koshu2_cd: matched.sel_koshu2_cd,
      reviewCount: matched.rows.filter((r) => r._needs_review).length
    }
  };
}

/**
 * 原紙見積テキストを解析しプレビュー用結果を返す
 */
export function previewGenbashoImport(text, db = meisaiDb) {
  const extracted = extractAllSections(text);
  const warnings = [];
  const sections = [];

  for (const sec of extracted) {
    if (!sec.ok) {
      warnings.push({ type: "extract_failed", detail: sec.reason || sec.preview || "解析失敗" });
      continue;
    }
    const matched = matchExtractedToDb(sec, db);
    const kojiType = sec.extractor === "wallpaper" ? "harikae" : "other";
    sections.push({
      extracted: sec,
      matched,
      previewSection: matchedToSection(matched, kojiType)
    });
  }

  const stats = {
    sections: sections.length,
    meisai_rows: sections.reduce((s, x) => s + (x.matched.rows?.length || 0), 0),
    matched_rows: sections.reduce((s, x) => s + (x.matched.rows?.filter((r) => r.matched)?.length || 0), 0),
    review_rows: sections.reduce((s, x) => s + (x.matched.rows?.filter((r) => r._needs_review)?.length || 0), 0),
    comments: sections.reduce((s, x) => s + (x.matched.comments?.length || 0), 0)
  };

  return { sections, stats, warnings, extracted };
}

/** プレビュー結果から editor 用セクション配列を生成 */
export function genbashoPreviewToSections(preview) {
  return (preview?.sections || []).map((s) => s.previewSection);
}

export function getKoshu2Label(cd) {
  return KOUSHU2_META[String(cd)]?.label || `工種${cd}`;
}
