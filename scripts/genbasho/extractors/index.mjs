/**
 * 工種別抽出器レジストリ
 */
import { extractWallpaperSection, canExtractSection as canWallpaper, EXTRACTOR_ID as WALLPAPER_ID } from "./wallpaper.mjs";

export const EXTRACTORS = [
  {
    id: WALLPAPER_ID,
    koshu2_cd: "1",
    label: "クロス貼替工事",
    canExtract: canWallpaper,
    extract: extractWallpaperSection
  }
];

/**
 * テキスト全体を工事ブロックに分割（番号付きタイトル行で区切る）
 */
export function splitIntoSections(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  /** @type {{ start: number, lines: string[] }[]} */
  const sections = [];
  let current = null;

  for (const line of lines) {
    const t = line.trim();
    if (/^\d+[\s　]/.test(t) && /工事/.test(t)) {
      if (current?.lines.length) sections.push(current);
      current = { start: sections.length, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current?.lines.length) sections.push(current);

  if (!sections.length && text?.trim()) {
    sections.push({ start: 0, lines: lines });
  }
  return sections;
}

/**
 * 全セクションを工種抽出器で処理
 */
export function extractAllSections(text) {
  const sections = splitIntoSections(text);
  const results = [];

  for (const sec of sections) {
    const block = sec.lines.join("\n");
    let handled = false;
    for (const ex of EXTRACTORS) {
      if (ex.canExtract(sec.lines)) {
        const out = ex.extract(block);
        results.push(out);
        handled = true;
        break;
      }
    }
    if (!handled) {
      results.push({
        ok: false,
        reason: "no_extractor",
        preview: sec.lines.slice(0, 3).join(" | ")
      });
    }
  }
  return results;
}
