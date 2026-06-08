/**
 * クロス貼替工事（壁紙工事）— 原紙見積テキスト抽出
 *
 * 判断ロジック:
 * ① 単位・数量・単価・合計が揃う行 → 明細
 * ② 先頭番号 + 工事名 → タイトル（品番 SPxxxx を抽出）
 * ③ ※ 始まり → コメント
 * ④ N.N×N.N 形式のみ → 寸法（zumen_suryo 用、後続処理）
 */
import {
  splitRowCells,
  parseNumber,
  isDimensionLine,
  isCommentLine,
  isTitleLine,
  isMeisaiLine,
  extractHinban,
  normalizeLabel
} from "../textUtils.mjs";

export const KOUSHU2_CD = "1";
export const EXTRACTOR_ID = "wallpaper";

const TITLE_RE = /クロス|壁紙|ｸﾛｽ|クロス貼替/;

export function canExtractSection(lines) {
  const head = lines.slice(0, 5).join(" ");
  return TITLE_RE.test(head);
}

function parseMeisaiFromCells(cells, ctx) {
  const unitIdx = cells.findIndex((c) => /^(㎡|式|台|箇所|ｍ|m)$/i.test(String(c).trim()));
  if (unitIdx < 0) return null;

  const tani = cells[unitIdx].trim();
  const suryo = parseNumber(cells[unitIdx + 1]);
  const tanka = parseNumber(cells[unitIdx + 2]);
  const kakaku = parseNumber(cells[unitIdx + 3]);

  if (suryo == null || tanka == null) return null;

  const before = cells.slice(0, unitIdx).filter((c) => c && c !== "【内訳】");
  let basho = "";
  let ceil = null;
  let wall = null;

  const numsBefore = [];
  const textsBefore = [];
  for (const c of before) {
    const n = parseNumber(c);
    if (n != null && !/[㎡]/.test(c)) numsBefore.push(n);
    else if (c && !/内訳|天井|壁|名称/.test(c)) textsBefore.push(c);
  }

  if (textsBefore.length) basho = textsBefore[0];
  else if (before.length) basho = before.find((c) => c && !/^\d/.test(c) && !/内訳/.test(c)) || "";

  if (numsBefore.length >= 2) {
    ceil = numsBefore[0];
    wall = numsBefore[1];
  } else if (numsBefore.length === 1) {
    wall = numsBefore[0];
  }

  const rows = [];
  if (ceil != null && ceil > 0) {
    rows.push({
      basho,
      bui: "天井",
      suryo: ceil,
      tani,
      tanka,
      kakaku: Math.round(ceil * tanka),
      taisho1: ctx.default_taisho1,
      type: ctx.hinban || ""
    });
  }
  if (wall != null && wall > 0) {
    rows.push({
      basho,
      bui: "壁",
      suryo: wall,
      tani,
      tanka,
      kakaku: kakaku ?? Math.round(wall * tanka),
      taisho1: ctx.default_taisho1,
      type: ctx.hinban || ""
    });
  }
  if (!rows.length && suryo != null) {
    rows.push({
      basho: basho || "（場所未特定）",
      bui: "壁",
      suryo,
      tani,
      tanka,
      kakaku: kakaku ?? Math.round(suryo * tanka),
      taisho1: ctx.default_taisho1,
      type: ctx.hinban || ""
    });
  }
  return rows;
}

function normalizeBashoName(name) {
  const n = String(name ?? "").trim();
  if (/洗面.*トイレ|洗面ﾄｲﾚ/i.test(n)) return "洗面・トイレ";
  if (/玄関.*キッチン/i.test(n)) return "玄関・廊下";
  return n;
}

/**
 * @param {string} text - 原紙見積の1工事ブロック（テキスト）
 */
export function extractWallpaperSection(text) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim());

  if (!canExtractSection(lines)) {
    return { ok: false, reason: "not_wallpaper_section", extractor: EXTRACTOR_ID };
  }

  let title = "";
  let hinban = "";
  let totalM2 = null;
  /** @type {object[]} */
  const rows = [];
  /** @type {object[]} */
  const comments = [];
  /** @type {object[]} */
  const dimensions = [];
  let currentBasho = "";
  let inUchiwake = false;

  const ctx = {
    hinban: "",
    default_taisho1: "クロス貼替え(量産品)"
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isTitleLine(trimmed) && TITLE_RE.test(trimmed)) {
      const rawTitle = trimmed.replace(/^\d+[\s　]+/, "").split("\t")[0].trim();
      hinban = extractHinban(trimmed) || extractHinban(lines.join(" "));
      title = rawTitle.replace(/\s*[A-Z]{1,4}\d{3,6}[A-Z]?\s*$/i, "").trim() || "クロス貼替工事";
      ctx.hinban = hinban;
      continue;
    }

    if (/総[㎡m²]/.test(trimmed)) {
      const m = trimmed.match(/(\d+\.?\d*)\s*[㎡m²]/);
      if (m) totalM2 = parseNumber(m[1]);
      continue;
    }

    if (/【内訳】/.test(trimmed)) {
      inUchiwake = true;
      continue;
    }

    if (isCommentLine(trimmed)) {
      comments.push({ text: trimmed.replace(/^※\s*/, "※") });
      continue;
    }

    if (isDimensionLine(trimmed)) {
      const dims = trimmed.match(/\d+\.?\d*\s*[×xX＊]\s*\d+\.?\d*/g) || [];
      dimensions.push({
        basho: currentBasho,
        raw: trimmed,
        dimensions: dims,
        note: "寸法行 — zumen_suryo 候補（RPA 前に要確認）"
      });
      continue;
    }

    const cells = splitRowCells(line);
    if (!isMeisaiLine(cells)) {
      const nameOnly = cells.find((c) => c && !/内訳|天井|壁/.test(c) && !/^\d/.test(c));
      if (nameOnly && !isDimensionLine(nameOnly)) currentBasho = normalizeBashoName(nameOnly);
      continue;
    }

    const parsed = parseMeisaiFromCells(cells, ctx);
    if (parsed?.length) {
      for (const r of parsed) {
        rows.push({ ...r, basho: normalizeBashoName(r.basho || currentBasho) });
        currentBasho = normalizeBashoName(r.basho || currentBasho);
      }
    }
  }

  return {
    ok: true,
    extractor: EXTRACTOR_ID,
    sel_koshu2_cd: KOUSHU2_CD,
    koshu1_text: "通常工事",
    koshu2_text: "クロス",
    title: title || "クロス貼替工事",
    hinban,
    total_m2: totalM2,
    default_taisho1: ctx.default_taisho1,
    in_uchiwake: inUchiwake,
    rows,
    comments,
    dimensions,
    row_count: rows.length
  };
}
