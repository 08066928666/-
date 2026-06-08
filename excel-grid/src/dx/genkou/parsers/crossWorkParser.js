/**
 * クロス貼替工事（壁紙工事）の原紙見積書パーサ
 *
 * 判断ロジック:
 * - 「クロス貼替工事」→ 壁紙工事 (koshu2_id=1)
 * - 各場所の天井・壁㎡を明細化
 * - 寸法行 (2.1×3.45 …) は dimensions として保持（RPA 補助）
 * - ※ コメントはそのまま
 * - 品番 (SP2519 等) → type / 品番欄
 */
import { classifyGenkouLine, detailToMeisaiRows } from "../genkouRowClassifier.js";
import { normalizeJaText } from "../textNormalize.js";

const CROSS_KOSHU2_ID = "1";
const CROSS_TITLE_RE = /クロス|壁紙|ｸﾛｽ|張替|貼替/;

/**
 * @param {string} text 原紙見積書のテキスト（タブ区切り or 改行区切り）
 */
export function parseCrossWorkSection(text) {
  const lines = String(text ?? "")
    .split(/\n/)
    .map((l) => l.replace(/\r/g, ""));

  /** @type {Array<Record<string, unknown>>} */
  const blocks = [];
  /** @type {Record<string, unknown>} */
  let ctx = {
    koshu2Id: CROSS_KOSHU2_ID,
    title: "",
    hinban: "",
    taisho1: "クロス貼替",
    totalM2: null
  };
  /** @type {string | null} */
  let lastBasho = null;

  for (const line of lines) {
    const classified = classifyGenkouLine(line);

    if (classified.kind === "empty") continue;

    if (classified.kind === "title" && CROSS_TITLE_RE.test(classified.title || "")) {
      ctx = {
        koshu2Id: CROSS_KOSHU2_ID,
        title: classified.title,
        hinban: classified.hinban || ctx.hinban,
        taisho1: "クロス貼替",
        totalM2: null
      };
      blocks.push({ kind: "title", ...ctx });
      continue;
    }

    if (classified.kind === "hinban") {
      ctx.hinban = classified.hinban || ctx.hinban;
      continue;
    }

    if (classified.kind === "summary") {
      ctx.totalM2 = classified.totalM2;
      blocks.push({ kind: "summary", text: classified.text, totalM2: classified.totalM2 });
      continue;
    }

    if (classified.kind === "breakdown_header") {
      blocks.push({ kind: "breakdown_header" });
      continue;
    }

    if (classified.kind === "detail") {
      lastBasho = classified.basho || lastBasho;
      const meisaiRows = detailToMeisaiRows(classified, ctx);
      for (const row of meisaiRows) {
        blocks.push({ kind: "extracted_meisai", ...row, _rawDetail: classified });
      }
      continue;
    }

    if (classified.kind === "dimension") {
      blocks.push({
        kind: "dimension",
        basho: lastBasho,
        dimensions: classified.dimensions,
        raw: classified.raw,
        _note: "寸法は補助情報。面積は明細行の㎡を優先。"
      });
      continue;
    }

    if (classified.kind === "comment") {
      blocks.push({
        kind: "comment",
        text: classified.text,
        raw: classified.raw
      });
      continue;
    }
  }

  const meisai = blocks.filter((b) => b.kind === "extracted_meisai");
  const comments = blocks.filter((b) => b.kind === "comment");
  const dimensions = blocks.filter((b) => b.kind === "dimension");

  return {
    koshu2Id: CROSS_KOSHU2_ID,
    koshuLabel: "クロス工事",
    title: ctx.title || "クロス貼替工事",
    hinban: ctx.hinban,
    totalM2: ctx.totalM2,
    blocks,
    meisai,
    comments,
    dimensions,
    stats: {
      meisaiCount: meisai.length,
      commentCount: comments.length,
      dimensionCount: dimensions.length
    }
  };
}

/**
 * 原紙テキスト全体からクロス工事セクションを切り出し
 * @param {string} fullText
 */
export function extractCrossSectionFromDocument(fullText) {
  const text = String(fullText ?? "");
  const lines = text.split(/\n/);
  /** @type {string[]} */
  const section = [];
  let inSection = false;

  for (const line of lines) {
    const c = classifyGenkouLine(line);
    if (c.kind === "title" && CROSS_TITLE_RE.test(c.title || line)) {
      if (inSection && section.length) break;
      inSection = true;
      section.push(line);
      continue;
    }
    if (inSection) {
      const nextTitle = classifyGenkouLine(line);
      if (
        nextTitle.kind === "title" &&
        nextTitle.title &&
        /工事/.test(nextTitle.title) &&
        !CROSS_TITLE_RE.test(nextTitle.title)
      ) {
        break;
      }
      section.push(line);
    }
  }

  if (!section.length && CROSS_TITLE_RE.test(text)) {
    return parseCrossWorkSection(text);
  }

  return parseCrossWorkSection(section.join("\n"));
}
