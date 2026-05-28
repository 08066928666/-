/**
 * row_kbn の orderedBlocks を「工事2＝ヘッダ、その下の明細＝同じ束ね」に還元。
 * 平板 UI（左：工事パッケージ / 右：明細行）のたたき台用。
 */

/**
 * @typedef {"main" | "fee" | "parts" | "other"} MeisaiLineKind
 */

/**
 * @typedef {{
 *   htmlIndex: string,
 *   koshu2Id: string,
 *   item_name: string,
 *   basho: string,
 *   quantity: number | null,
 *   unit: string,
 *   unit_price: number | null,
 *   summaryLine2: string,
 *   lineKind: MeisaiLineKind,
 *   fields: Record<string, string>
 * }} MeisaiLineInPackage
 */

/**
 * @typedef {{
 *   id: string,
 *   headerHtmlIndex: string,
 *   koshu2Id: string,
 *   title: string,
 *   daiBunrui: string,
 *   lines: MeisaiLineInPackage[],
 *   comments: Array<{ htmlIndex: string, text: string, fields: Record<string, string> }>
 * }} HtmlWorkPackage
 */

/**
 * 品目名から行の性格を粗く推定（水栓一式の「同上設備交換費」など）
 * @param {string} itemName
 * @returns {MeisaiLineKind}
 */
export function inferMeisaiLineKind(itemName) {
  const n = String(itemName || "");
  if (/同上|交換費|設備交換費|設備交換|撤去費|処分費|諸経費/.test(n)) return "fee";
  if (/部材|材料|付属品|オプション/.test(n)) return "parts";
  if (/^(—|－|-|)$/u.test(n.trim()) || n === "（品目なし）") return "other";
  return "main";
}

/**
 * @param {{ kind: string, index: string, L_koshu2_cd?: string, line1?: string, line2?: string, fields?: Record<string, string> }} b
 * @returns {MeisaiLineInPackage}
 */
function blockToMeisaiLine(b) {
  const f = b.fields && typeof b.fields === "object" ? b.fields : {};
  const item_name = String(b.line1 || "").trim();
  const qtyRaw = String(f.suryo ?? "").replace(/,/g, "");
  const qty = Number(qtyRaw);
  const tankaRaw = String(f.tanka ?? "").replace(/,/g, "");
  const tanka = Number(tankaRaw);
  return {
    htmlIndex: String(b.index),
    koshu2Id: String(b.L_koshu2_cd || "").trim(),
    item_name,
    basho: String(f.basho || "").trim(),
    quantity: Number.isFinite(qty) && qty > 0 ? qty : null,
    unit: String(f.tani || "式").trim() || "式",
    unit_price: Number.isFinite(tanka) && tanka > 0 ? tanka : null,
    summaryLine2: String(b.line2 || "").trim(),
    lineKind: inferMeisaiLineKind(item_name),
    fields: { ...f }
  };
}

/**
 * @param {Array<{ kind: string, index: string, L_koshu2_cd?: string, line1?: string, line2?: string, fields?: Record<string, string> }>} orderedBlocks
 * @returns {HtmlWorkPackage[]}
 */
export function buildWorkPackagesFromOrderedBlocks(orderedBlocks) {
  if (!Array.isArray(orderedBlocks) || !orderedBlocks.length) return [];

  let daiBunrui = "";
  /** @type {HtmlWorkPackage | null} */
  let cur = null;
  /** @type {HtmlWorkPackage[]} */
  const packages = [];

  const pushCur = () => {
    if (cur && (cur.lines.length > 0 || cur.comments.length > 0 || cur.headerHtmlIndex)) {
      packages.push(cur);
    }
    cur = null;
  };

  for (const b of orderedBlocks) {
    const k = String(b.kind || "").trim();
    if (k === "1") {
      daiBunrui = String(b.line1 || "").trim();
      continue;
    }
    if (k === "2") {
      pushCur();
      const kid = String(b.L_koshu2_cd || "").trim();
      cur = {
        id: `wp-${b.index}`,
        headerHtmlIndex: String(b.index),
        koshu2Id: kid,
        title: String(b.line1 || "").trim() || (kid ? `工種 ${kid}` : "（工事区分なし）"),
        daiBunrui,
        lines: [],
        comments: []
      };
      continue;
    }
    if (k === "4") {
      const entry = {
        htmlIndex: String(b.index),
        text: String(b.line1 || "").trim(),
        fields: b.fields && typeof b.fields === "object" ? { ...b.fields } : {}
      };
      if (cur) cur.comments.push(entry);
      else {
        cur = {
          id: `wp-cmt-${b.index}`,
          headerHtmlIndex: "",
          koshu2Id: "",
          title: "（工事2より前のコメント）",
          daiBunrui,
          lines: [],
          comments: [entry]
        };
      }
      continue;
    }
    if (k === "3") {
      if (!cur) {
        cur = {
          id: `wp-orph-${b.index}`,
          headerHtmlIndex: "",
          koshu2Id: String(b.L_koshu2_cd || "").trim(),
          title: "（工事2行より前の明細）",
          daiBunrui,
          lines: [],
          comments: []
        };
      }
      cur.lines.push(blockToMeisaiLine(b));
    }
  }
  pushCur();
  return packages;
}
