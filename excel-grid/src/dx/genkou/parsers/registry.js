/**
 * 工種別パーサレジストリ
 */
import { extractCrossSectionFromDocument, parseCrossWorkSection } from "./crossWorkParser.js";

/** @type {Record<string, { id: string, label: string, detect: (text: string) => boolean, parse: (text: string) => unknown }>} */
export const KOSHU_PARSERS = {
  cross: {
    id: "1",
    label: "クロス工事",
    detect: (text) => /クロス|壁紙|ｸﾛｽ|張替|貼替/.test(text),
    parse: (text) => extractCrossSectionFromDocument(text)
  }
};

/**
 * @param {string} koshuKey cross | all
 * @param {string} text
 */
export function parseGenkouByKoshu(koshuKey, text) {
  if (koshuKey === "all") {
    const results = [];
    for (const [key, parser] of Object.entries(KOSHU_PARSERS)) {
      if (parser.detect(text)) {
        results.push({ koshuKey: key, ...parser.parse(text) });
      }
    }
    return { mode: "all", sections: results };
  }

  const parser = KOSHU_PARSERS[koshuKey];
  if (!parser) {
    throw new Error(`Unknown koshu parser: ${koshuKey}. Available: ${Object.keys(KOSHU_PARSERS).join(", ")}`);
  }
  return { mode: "single", koshuKey, ...parser.parse(text) };
}

export { parseCrossWorkSection, extractCrossSectionFromDocument };
