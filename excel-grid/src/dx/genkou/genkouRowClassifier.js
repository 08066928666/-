/**
 * 原紙見積書テキスト行の分類（明細 / 標題 / コメント / 寸法）
 */
import {
  extractDimensions,
  isCommentLine,
  isDimensionLine,
  normalizeJaText,
  parseAmount,
  splitTabColumns
} from "./textNormalize.js";

const TITLE_SEQ_RE = /^(\d+)\s*(.+工事.*)$/;
const CROSS_TITLE_RE = /クロス|壁紙|ｸﾛｽ/;
const HINBAN_RE = /\b([A-Z]{1,3}\d{3,5})\b/;

/**
 * 行を分類
 * @param {string} rawLine
 * @returns {{ kind: string, [key: string]: unknown }}
 */
export function classifyGenkouLine(rawLine) {
  const line = String(rawLine ?? "").replace(/\r/g, "");
  const trimmed = line.trim();
  if (!trimmed) return { kind: "empty" };

  if (isCommentLine(trimmed)) {
    return { kind: "comment", text: trimmed.replace(/^[※＊*]\s*/, "").trim(), raw: trimmed };
  }

  if (isDimensionLine(trimmed)) {
    return { kind: "dimension", dimensions: extractDimensions(trimmed), raw: trimmed };
  }

  const cols = splitTabColumns(line);
  const nonEmpty = cols.filter((c) => c !== "");

  // ① 単位・数量・単価・合計が揃う → 明細
  const unitIdx = cols.findIndex((c) => /^(㎡|m²|m2|式|本|個|台|箇所)$/.test(c));
  if (unitIdx >= 0) {
    const unit = cols[unitIdx];
    const qty = parseAmount(cols[unitIdx + 1]);
    const tanka = parseAmount(cols[unitIdx + 2]);
    const kakaku = parseAmount(cols[unitIdx + 3]);
    if (qty != null && tanka != null && kakaku != null) {
      const basho = normalizeJaText(cols.find((c, i) => i < unitIdx && c && !/^\d+$/.test(c)) || "");
      const beforeUnit = cols.slice(0, unitIdx).filter((c) => c);
      let ceilingM2 = null;
      let wallM2 = null;
      if (beforeUnit.length >= 3) {
        ceilingM2 = parseAmount(beforeUnit[beforeUnit.length - 2]);
        wallM2 = parseAmount(beforeUnit[beforeUnit.length - 1]);
      } else if (beforeUnit.length === 2) {
        wallM2 = parseAmount(beforeUnit[1]);
      } else if (beforeUnit.length === 1) {
        wallM2 = parseAmount(beforeUnit[0]);
      }
      return {
        kind: "detail",
        basho: basho || beforeUnit[0] || "",
        ceilingM2,
        wallM2,
        unit,
        qty,
        tanka,
        kakaku,
        raw: trimmed,
        cols
      };
    }
  }

  // 内訳ヘッダ
  if (/【内訳】/.test(trimmed)) {
    return { kind: "breakdown_header", raw: trimmed, cols };
  }

  // 総㎡ サマリ行
  if (/総[㎡m²]/.test(trimmed) && /クロス|貼替|張替/.test(trimmed)) {
    const totalMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[㎡m²]/);
    return {
      kind: "summary",
      text: normalizeJaText(trimmed),
      totalM2: totalMatch ? parseAmount(totalMatch[1]) : null,
      raw: trimmed
    };
  }

  // ② 番号付き標題行
  const seqCol = cols[0];
  const titleCol = cols[1] || cols[0];
  if (/^\d+$/.test(seqCol) && /工事/.test(titleCol)) {
    const hinbanCol = [...cols].reverse().find((c) => HINBAN_RE.test(c));
    const hinban = hinbanCol ? (hinbanCol.match(HINBAN_RE) || [])[1] : "";
    return {
      kind: "title",
      seq: seqCol,
      title: normalizeJaText(titleCol),
      hinban,
      koshu2Id: CROSS_TITLE_RE.test(titleCol) ? "1" : "",
      raw: trimmed,
      cols
    };
  }

  const titleMatch = trimmed.match(TITLE_SEQ_RE);
  if (titleMatch) {
    const hinban = (trimmed.match(HINBAN_RE) || [])[1] || "";
    return {
      kind: "title",
      seq: titleMatch[1],
      title: normalizeJaText(titleMatch[2]),
      hinban,
      koshu2Id: CROSS_TITLE_RE.test(titleMatch[2]) ? "1" : "",
      raw: trimmed
    };
  }

  // 品番のみ末尾
  if (nonEmpty.length <= 2 && HINBAN_RE.test(trimmed)) {
    return { kind: "hinban", hinban: (trimmed.match(HINBAN_RE) || [])[1], raw: trimmed };
  }

  return { kind: "unknown", raw: trimmed, cols };
}

/**
 * 明細行から部位別のシステム明細を生成（クロス内訳：天井・壁）
 * @param {ReturnType<classifyGenkouLine> & { kind: "detail" }} detail
 * @param {{ hinban?: string, koshu2Id?: string, taisho1?: string }} ctx
 */
export function detailToMeisaiRows(detail, ctx = {}) {
  const rows = [];
  const base = {
    koshu2_id: ctx.koshu2Id || "1",
    taisho1: ctx.taisho1 || "クロス貼替",
    basho: detail.basho,
    tani: detail.unit || "㎡",
    tanka: detail.tanka,
    type: ctx.hinban || "",
    hinban: ctx.hinban || ""
  };

  if (detail.ceilingM2 != null && detail.ceilingM2 > 0) {
    rows.push({
      ...base,
      bui: "天井",
      suryo: detail.ceilingM2,
      kakaku: Math.round(detail.ceilingM2 * (detail.tanka || 0))
    });
  }
  if (detail.wallM2 != null && detail.wallM2 > 0) {
    rows.push({
      ...base,
      bui: "壁",
      suryo: detail.wallM2,
      kakaku: Math.round(detail.wallM2 * (detail.tanka || 0))
    });
  }

  if (!rows.length && detail.qty != null) {
    rows.push({
      ...base,
      bui: "壁",
      suryo: detail.qty,
      kakaku: detail.kakaku
    });
  }

  return rows;
}
