import { HASEKO_KOSHU2_SEED, normalizeKojiLabelText } from "./hasekoKoshu2Seed.js";
import { parseHtmlRowKbnStructured } from "./htmlKojiRowKbnParse.js";
import { buildWorkPackagesFromOrderedBlocks } from "./htmlKojiWorkPackages.js";

const SEED_IDS = new Set(HASEKO_KOSHU2_SEED.map((r) => String(r.id)));

/** select が長谷工系の工種プルダウンか */
function isKoshuLikeSelect(el) {
  if (!el || el.tagName !== "SELECT") return false;
  const key = `${el.name || ""} ${el.id || ""} ${el.className || ""}`;
  return /koshu|sel_koshu|工種|区分|koban/i.test(key);
}

/** ラベルから略称っぽい文字列 */
function shortFromLabel(label) {
  const t = normalizeKojiLabelText(String(label || "").replace(/（.*?）/g, "").replace(/\(.*?\)/g, ""));
  const noKoji = t.replace(/工事.*$/, "").trim();
  return noKoji.slice(0, 16) || t.slice(0, 12) || "明細";
}

/** 見出し行の誤検出を減らす */
function isNoiseHeaderText(txt) {
  return /一覧|内訳|明細|表$|内訳表|工事内容|項目|行番|No\.?$/i.test(txt);
}

function rowPlainText(tr) {
  return tr.textContent.replace(/[\s\n\r]+/g, " ").trim();
}

/**
 * 表の行が「工事区分見出し」（例: 鍵交換工事２）かどうか
 * @param {HTMLTableRowElement} tr
 * @returns {{ kind: "header", label: string } | { kind: "detail" } | { kind: "skip" }}
 */
export function classifyTableRow(tr) {
  const tds = [...tr.querySelectorAll(":scope > td, td")];
  const ths = [...tr.querySelectorAll(":scope > th, th")];
  const hasDetailInput = [...tr.querySelectorAll("input")].some((inp) => {
    const t = (inp.type || "text").toLowerCase();
    if (["hidden", "checkbox", "radio", "button", "submit"].includes(t)) return false;
    const nm = `${inp.name || ""} ${inp.id || ""}`.toLowerCase();
    return /taisho|mei|suryo|tanka|item|品目|数量|単価/.test(nm);
  });
  if (hasDetailInput && (tds.length >= 2 || ths.length >= 2)) return { kind: "detail" };

  const onlyTh = ths.length > 0 && tds.length === 0;
  if (onlyTh) {
    const txt = rowPlainText(tr);
    if (txt.length >= 3 && txt.length <= 80 && /工事/.test(txt) && !isNoiseHeaderText(txt)) {
      return { kind: "header", label: txt };
    }
  }

  if (tds.length === 1) {
    const td = tds[0];
    if (td.querySelector("input:not([type=hidden])") || td.querySelector("select")) return { kind: "detail" };
    const txt = td.textContent.replace(/[\s\n\r]+/g, " ").trim();
    // 長いセルは明細1列の誤検出になりやすい（すべてクロスに寄る原因）
    if (txt.length >= 3 && txt.length <= 48 && /工事/.test(txt) && !isNoiseHeaderText(txt)) {
      return { kind: "header", label: txt };
    }
  }

  if (tds.length >= 2) {
    const first = tds[0];
    const cs = parseInt(first.getAttribute("colspan") || "1", 10);
    const txt = first.textContent.replace(/[\s\n\r]+/g, " ").trim();
    const restHasControls = tds.slice(1).some((td) => td.querySelector("input,select"));
    if (!restHasControls && cs >= 2 && txt && /工事/.test(txt) && txt.length <= 120 && !isNoiseHeaderText(txt)) {
      return { kind: "header", label: txt };
    }
    if (!first.querySelector("input,select") && txt && /工事/.test(txt) && txt.length < 80 && !isNoiseHeaderText(txt)) {
      const restText = tds
        .slice(1)
        .map((td) => td.textContent.trim())
        .join("");
      if (!restText && !tds.slice(1).some((td) => td.querySelector("input,select"))) {
        return { kind: "header", label: txt };
      }
    }
  }

  if (tds.length >= 2) return { kind: "detail" };
  return { kind: "skip" };
}

/**
 * 長谷工系で多い「1列目＝工事区分名・2列目以降＝明細入力」の行
 * @param {HTMLTableRowElement} tr
 * @returns {{ label: string, sectionId: string, seedId: string | null } | null}
 */
export function getLeadingKojiColumnCell(tr) {
  const tds = [...tr.querySelectorAll("td")];
  if (tds.length < 3) return null;
  const first = tds[0];
  if (first.querySelector("input,select")) return null;
  const ft = first.textContent.replace(/[\s\n\r]+/g, " ").trim();
  if (!ft || ft.length < 3 || ft.length > 55) return null;
  if (!/工事/.test(ft) || isNoiseHeaderText(ft)) return null;
  if (/^[\d¥￥,.\s—]+$/u.test(ft)) return null;

  const hasDataInOther = tds.slice(1).some((td) =>
    [...td.querySelectorAll("input")].some((inp) => {
      const t = (inp.type || "text").toLowerCase();
      if (["hidden", "checkbox", "radio", "button", "submit"].includes(t)) return false;
      const nm = `${inp.name || ""} ${inp.id || ""}`.toLowerCase();
      return /taisho|mei|item|品目|suryo|tanka|内容|明細/.test(nm);
    })
  );
  if (!hasDataInOther) return null;

  const seedId = matchSeedCategoryId(ft) || fuzzyMatchSeedFromHeading(ft);
  const sectionId = seedId ?? stableSectionId(ft);
  return { label: ft, sectionId, seedId };
}

/**
 * 明細名から既定の koshu2_id を推定（行に select が無い HTML 用）。長い語を先に照合。
 * @param {string} item_name
 * @returns {string}
 */
export function inferKoshu2FromItemName(item_name) {
  const raw = String(item_name || "").trim();
  if (!raw) return "";
  let n;
  try {
    n = raw.normalize("NFKC").toLowerCase();
  } catch {
    n = raw.toLowerCase();
  }

  /** @type {{ id: string, keys: string[] }[]} */
  const groups = [
    { id: "1", keys: ["クロス貼", "ｸﾛｽ貼", "壁クロス", "壁紙", "クロス", "ｸﾛｽ"] },
    { id: "2", keys: ["フローリング", "床材", "床工事", "床", "cf", "フロア"] },
    { id: "3", keys: ["建具交換", "室内ドア", "ドア交換", "建具", "扉", "ドア"] },
    { id: "5", keys: ["クリーニング", "清掃", "ハウスクリーニング"] },
    { id: "6", keys: ["鍵交換", "シリンダー", "ディンプル", "鍵工事", "鍵"] },
    { id: "8", keys: ["塗装", "ペンキ", "ラッカー"] },
    { id: "9", keys: ["雑工事", "雑費", "雑"] },
    { id: "10", keys: ["設備機器", "温水洗浄", "便座", "便器", "水栓", "換気扇", "レンジフード", "設備"] },
    { id: "12", keys: ["必須工事", "必須"] },
    { id: "13", keys: ["固定工事", "固定"] },
    { id: "16", keys: ["交換工事", "交換"] },
    { id: "17", keys: ["アスベスト"] }
  ];

  const scored = [];
  for (const g of groups) {
    for (const k of g.keys) {
      let kn;
      try {
        kn = k.normalize("NFKC").toLowerCase();
      } catch {
        kn = k.toLowerCase();
      }
      if (!kn) continue;
      if (n.includes(kn)) scored.push({ id: g.id, len: kn.length });
    }
  }
  if (!scored.length) return "";
  scored.sort((a, b) => b.len - a.len || Number(a.id) - Number(b.id));
  return scored[0].id;
}

/** シード工事区分と見出しが一致する場合のみシード id（部分一致は作らない：鍵交換工事２ は sec-* 側へ） */
export function matchSeedCategoryId(heading) {
  const h = String(heading)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[／/]/g, "");
  if (!h) return null;
  for (const row of HASEKO_KOSHU2_SEED) {
    if (row.discontinued) continue;
    const L = String(row.label || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[／/]/g, "");
    if (!L) continue;
    if (h === L) return String(row.id);
    if (h.startsWith(L) && h.length <= L.length + 6) return String(row.id);
  }
  return null;
}

/**
 * 見出しから既定工事 id を緩く推定（例: 鍵交換工事２ → id=6）。表示名は HTML のまま overrides で上書きする。
 */
export function fuzzyMatchSeedFromHeading(heading) {
  const h = String(heading)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[／/]/g, "");
  if (!h || !/工事/.test(h)) return null;
  if (/鍵|シリンダー|ディンプル|鍵交換/.test(h)) return "6";
  if (/クロス|壁紙|ｸﾛｽ/.test(h)) return "1";
  if (/フローリング|床材|床/.test(h)) return "2";
  if (/建具|室内ドア|ドア|扉/.test(h)) return "3";
  if (/和室/.test(h)) return "7";
  if (/クリーニング|清掃/.test(h)) return "5";
  if (/塗装|ペンキ/.test(h)) return "8";
  if (/雑/.test(h)) return "9";
  if (/設備|便座|便器|水栓|換気扇|レンジ|機器/.test(h)) return "10";
  if (/必須/.test(h)) return "12";
  if (/固定/.test(h)) return "13";
  if (/交換/.test(h)) return "16";
  if (/アスベスト/.test(h)) return "17";
  return null;
}

/** HTML 見出しから安定したカスタム区分 id */
export function stableSectionId(label) {
  const s = String(label).trim().replace(/\s+/g, " ");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `sec-${(h >>> 0).toString(16)}`;
}

/**
 * 画面ヘッダ付近の工事名・物件・号室を推定
 * @param {Document} doc
 */
function extractPageMeta(doc) {
  let constructionTitle = "";
  let estateName = "";
  let roomNo = "";

  doc.querySelectorAll("input,textarea").forEach((el) => {
    const val =
      el.tagName === "TEXTAREA"
        ? String(el.value || el.textContent || "").trim()
        : String(el.value || "").trim();
    if (!val || val.length > 500) return;
    const nm = `${el.name || ""} ${el.id || ""} ${el.getAttribute("placeholder") || ""}`.toLowerCase();
    if (
      /kenmei|件名|工事名|工事.?名称|work_?title|koji_?mei|subject|mitsumori.*ken|見積.*件|案件名|工事.?件名/.test(nm)
    ) {
      if (val.length >= 2) constructionTitle = val.slice(0, 300);
    } else if (/bukken|物件|建物|estate|mansion|マンション|building|shozaichi|所在地/.test(nm)) {
      if (val.length >= 2) estateName = val.slice(0, 200);
    } else if (/heya|部屋|号室|room|roomno|部屋番/.test(nm)) {
      if (val.length >= 1) roomNo = val.slice(0, 80);
    }
  });

  const titleTag = doc.querySelector("title")?.textContent?.trim() || "";
  if (!constructionTitle && titleTag.length >= 2 && titleTag.length <= 200 && !/ログイン|error/i.test(titleTag)) {
    constructionTitle = titleTag.slice(0, 300);
  }

  return {
    constructionTitle: constructionTitle.trim(),
    estateName: estateName.trim(),
    roomNo: roomNo.trim()
  };
}

/**
 * @param {HTMLTableRowElement} tr
 * @param {string} forcedKoshuId セクションに紐付ける工種 id
 * @param {string} defaultKoshuId 文書先頭の工種 select の既定値（allowGlobalDefault が true のとき最後の手段）
 * @param {boolean} allowGlobalDefault 文書全体の先頭 select 値へ丸めてよいか。false のときは品名推定までで無ければ行を捨てる（誤ってすべてクロスになるのを防ぐ）
 */
function parseDetailRow(tr, forcedKoshuId, defaultKoshuId, allowGlobalDefault = true) {
  const tds = tr.querySelectorAll("td");
  const ths = tr.querySelectorAll("th");
  if (tds.length === 0 && ths.length > 0) return null;
  if (tds.length < 2) return null;

  let item_name = "";
  let basho = "";
  let quantity = 1;
  tr.querySelectorAll("input").forEach((inp) => {
    const typ = (inp.type || "text").toLowerCase();
    if (typ === "hidden" || typ === "checkbox" || typ === "radio" || typ === "button" || typ === "submit") return;
    const nm = `${inp.name || ""} ${inp.id || ""}`.toLowerCase();
    const v = String(inp.value || "").trim();
    if (!v) return;
    if (/basho|basyo|場所|place|loc|部位|bui/.test(nm)) {
      basho = v.slice(0, 200);
    } else if (/suryo|qty|quantity|数量|suuryou/.test(nm)) {
      const n = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) quantity = n;
    } else if (/taisho|item|mei|name|内容|明細|品目|工事内容|koji/.test(nm)) {
      item_name = v;
    }
  });

  if (!item_name) {
    for (const td of tds) {
      if (td.querySelector("select,input")) continue;
      const t = td.textContent?.trim().replace(/\s+/g, " ") ?? "";
      if (t.length < 2) continue;
      if (/^[\d¥￥,.\s\-—]+$/.test(t)) continue;
      if (/^(小計|合計|計|行|No\.?)$/i.test(t)) continue;
      item_name = t.slice(0, 200);
      break;
    }
  }

  if (!item_name) return null;

  let koshu2_id = String(forcedKoshuId || "").trim();
  if (!koshu2_id) {
    const rowSel = tr.querySelector("select");
    if (rowSel && isKoshuLikeSelect(rowSel) && rowSel.value) {
      koshu2_id = String(rowSel.value).trim();
    }
  }
  if (!koshu2_id) {
    koshu2_id = inferKoshu2FromItemName(item_name);
  }
  if (!koshu2_id && allowGlobalDefault) {
    koshu2_id = String(defaultKoshuId || "").trim();
  }
  if (!koshu2_id) return null;

  let unit = "式";
  const rowText = tr.textContent || "";
  if (/㎡|m2|ｍ２/i.test(rowText)) unit = "㎡";
  else if (/台|箇所|式|ｍ|m\b/i.test(rowText)) {
    const m = rowText.match(/(台|箇所|式|ｍ)/);
    if (m) unit = m[1];
  }

  let unit_price = 0;
  tr.querySelectorAll("input").forEach((inp) => {
    const nm = `${inp.name || ""}`.toLowerCase();
    if (/tanka|price|kingaku|単価|金額/.test(nm)) {
      const n = Number(String(inp.value).replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) unit_price = n;
    }
  });
  if (!unit_price) {
    const nums = [];
    tds.forEach((td) => {
      const m = td.textContent?.match(/[¥￥]?\s*([\d,]+)/);
      if (m) {
        const n = Number(m[1].replace(/,/g, ""));
        if (Number.isFinite(n) && n >= 10) nums.push(n);
      }
    });
    if (nums.length) unit_price = nums[nums.length - 1];
  }

  return { koshu2_id, item_name, unit, unit_price, basho, quantity };
}

/**
 * HTML（長谷工見積画面の断片など）から工種一覧と明細行を推定抽出。
 * 表内に「〇〇工事」見出し行がある場合は、その順で工事区分を作り、下の明細をその区分に紐付け。
 *
 * @param {string} html
 * @returns {{
 *   categories: Array<{ id: string, label: string, koshu2_text: string, discontinued: boolean }>,
 *   sectionDefinitions: Array<{ id: string, label: string, koshu2_text: string, discontinued: boolean, htmlImportOrder: number }>,
 *   masters: Array<{ item_name: string, unit: string, unit_price: number, koshu2_id: string, basho?: string, quantity?: number }>,
 *   warnings: string[],
 *   constructionTitle: string,
 *   estateName: string,
 *   roomNo: string,
 *   useSectionBinding: boolean,
 *   seedHeaderPatches: Array<{ id: string, label: string, koshu2_text: string }>,
 *   usedRowKbnImport: boolean,
 *   structurePreview: Array<{ kind: string, index: string, L_koshu2_cd?: string, line1?: string, line2?: string, fields?: Record<string, string> }>,
 *   workPackages: Array<{ id: string, headerHtmlIndex: string, koshu2Id: string, title: string, daiBunrui: string, lines: unknown[], comments: unknown[] }>
 * }}
 */
export function parseHasekoHtmlToKojiAndMeisai(html) {
  const warnings = [];
  const empty = {
    categories: [],
    sectionDefinitions: [],
    seedHeaderPatches: [],
    masters: [],
    warnings,
    constructionTitle: "",
    estateName: "",
    roomNo: "",
    useSectionBinding: false,
    usedRowKbnImport: false,
    structurePreview: [],
    workPackages: []
  };
  if (!html || typeof html !== "string" || !html.trim()) {
    warnings.push("HTML が空です");
    return empty;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const { constructionTitle, estateName, roomNo } = extractPageMeta(doc);

  const categoryById = new Map();

  /** @type {HTMLSelectElement[]} */
  const koshuSelects = [];
  doc.querySelectorAll("select").forEach((el) => {
    if (isKoshuLikeSelect(el)) koshuSelects.push(el);
  });

  for (const sel of koshuSelects) {
    for (let i = 0; i < sel.options.length; i++) {
      const opt = sel.options[i];
      const id = String(opt.value ?? "").trim();
      const label = String(opt.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!id || id === "0" || opt.disabled) continue;
      if (!categoryById.has(id)) {
        const lab = normalizeKojiLabelText(label || id);
        categoryById.set(id, {
          id,
          label: lab || id,
          koshu2_text: shortFromLabel(lab || id),
          discontinued: /廃止|廃\b/.test(label)
        });
      }
    }
  }

  let defaultKoshuId = "";
  if (koshuSelects.length) {
    const fs = koshuSelects[0];
    if (fs.value) defaultKoshuId = String(fs.value).trim();
    else {
      const first = Array.from(fs.options).find((o) => o.value && String(o.value).trim() !== "0");
      if (first) defaultKoshuId = String(first.value).trim();
    }
  }
  if (!defaultKoshuId && categoryById.size) {
    defaultKoshuId = [...categoryById.keys()][0];
  }

  const rowStruct = parseHtmlRowKbnStructured(doc);

  const masters = [];
  const seenMaster = new Set();
  const sectionById = new Map();
  const seedPatchById = new Map();
  let sectionOrder = 0;
  let useSectionBinding = false;
  let usedRowKbnImport = false;
  let docHasSectionHeader = false;
  /** @type {Array<{ kind: string, index: string, L_koshu2_cd?: string, line1?: string, line2?: string, fields?: Record<string, string> }>} */
  let structurePreview = [];
  /** @type {ReturnType<typeof buildWorkPackagesFromOrderedBlocks>} */
  let workPackages = [];

  function recordSeedOverrideFromHtml(seedId, label) {
    if (!seedId) return;
    const sid = String(seedId);
    if (!SEED_IDS.has(sid)) return;
    seedPatchById.set(sid, {
      id: sid,
      label: String(label || "").trim().slice(0, 200),
      koshu2_text: shortFromLabel(label)
    });
  }

  if (rowStruct?.detected) {
    usedRowKbnImport = true;
    for (const w of rowStruct.warnings || []) warnings.push(w);
    for (const p of rowStruct.seedPatches || []) {
      const sid = String(p.id);
      if (SEED_IDS.has(sid)) {
        seedPatchById.set(sid, { id: sid, label: p.label, koshu2_text: p.koshu2_text });
      }
    }
    for (const m of rowStruct.masters || []) {
      const dedup = `${m.koshu2_id}|||${m.item_name}`;
      if (seenMaster.has(dedup)) continue;
      seenMaster.add(dedup);
      masters.push(m);
    }
    warnings.push(
      "row_kbn + name=field[index] 構造を検出し、公式と同じ状態機で工事区分コードを明細に継承して取り込みました。"
    );
    structurePreview = Array.isArray(rowStruct.orderedBlocks) ? rowStruct.orderedBlocks : [];
    workPackages = buildWorkPackagesFromOrderedBlocks(structurePreview);
  } else {
  const tables = [...doc.querySelectorAll("table")];
  docHasSectionHeader = tables.some((tbl) => {
    const rs = tbl.rows ? [...tbl.rows] : [...tbl.querySelectorAll("tr")];
    return rs.some((tr) => classifyTableRow(tr).kind === "header" || getLeadingKojiColumnCell(tr));
  });
  /** 文書内に工事見出しがあるとき、先頭の工種 select の value に丸めない（無 select 行がすべてクロスになるのを防ぐ） */
  const allowGlobalDefault = !docHasSectionHeader;

  tables.forEach((table) => {
    let sawHeaderInTable = false;
    let currentSectionId = "";
    const rows = table.rows ? [...table.rows] : [...table.querySelectorAll("tr")];

    rows.forEach((tr) => {
      const lead = getLeadingKojiColumnCell(tr);
      const cl = classifyTableRow(tr);
      if (cl.kind === "header") {
        sawHeaderInTable = true;
        useSectionBinding = true;
        const label = cl.label;
        const seedId = matchSeedCategoryId(label) || fuzzyMatchSeedFromHeading(label);
        const id = seedId ?? stableSectionId(label);
        currentSectionId = id;
        if (seedId) recordSeedOverrideFromHtml(seedId, label);
        if (!seedId && !sectionById.has(id)) {
          sectionById.set(id, {
            id,
            label: label.slice(0, 200),
            koshu2_text: shortFromLabel(label),
            discontinued: false,
            htmlImportOrder: sectionOrder++
          });
        }
        if (!categoryById.has(id)) {
          categoryById.set(id, {
            id,
            label: label.slice(0, 200),
            koshu2_text: shortFromLabel(label),
            discontinued: /廃止|廃\b/.test(label)
          });
        }
        return;
      }

      if (lead) {
        useSectionBinding = true;
        sawHeaderInTable = true;
        currentSectionId = lead.sectionId;
        if (lead.seedId) recordSeedOverrideFromHtml(lead.seedId, lead.label);
        if (!lead.seedId && !sectionById.has(lead.sectionId)) {
          sectionById.set(lead.sectionId, {
            id: lead.sectionId,
            label: lead.label.slice(0, 200),
            koshu2_text: shortFromLabel(lead.label),
            discontinued: false,
            htmlImportOrder: sectionOrder++
          });
        }
        if (!categoryById.has(lead.sectionId)) {
          categoryById.set(lead.sectionId, {
            id: lead.sectionId,
            label: lead.label.slice(0, 200),
            koshu2_text: shortFromLabel(lead.label),
            discontinued: false
          });
        }
        const row1 = parseDetailRow(tr, lead.sectionId, defaultKoshuId, allowGlobalDefault);
        if (!row1) return;
        const dedupKey1 = `${row1.koshu2_id}|||${row1.item_name}`;
        if (seenMaster.has(dedupKey1)) return;
        seenMaster.add(dedupKey1);
        masters.push(row1);
        return;
      }

      if (cl.kind !== "detail") return;

      const forced = sawHeaderInTable && currentSectionId ? currentSectionId : "";
      const row = parseDetailRow(tr, forced, defaultKoshuId, allowGlobalDefault);
      if (!row) return;

      const dedupKey = `${row.koshu2_id}|||${row.item_name}`;
      if (seenMaster.has(dedupKey)) return;
      seenMaster.add(dedupKey);
      masters.push(row);
    });
  });

  if (!useSectionBinding) {
    sectionById.clear();
    sectionOrder = 0;
    const allRows = doc.querySelectorAll("table tr");
    allRows.forEach((tr) => {
      const cl = classifyTableRow(tr);
      if (cl.kind === "header" || cl.kind === "skip") return;
      const row = parseDetailRow(tr, "", defaultKoshuId, true);
      if (!row) return;
      const dedupKey = `${row.koshu2_id}|||${row.item_name}`;
      if (seenMaster.has(dedupKey)) return;
      seenMaster.add(dedupKey);
      masters.push(row);
    });
  }

  }

  const sectionDefinitions = [...sectionById.values()].sort((a, b) => a.htmlImportOrder - b.htmlImportOrder);

  for (const s of sectionDefinitions) {
    if (!categoryById.has(s.id)) {
      categoryById.set(s.id, {
        id: s.id,
        label: s.label,
        koshu2_text: s.koshu2_text,
        discontinued: s.discontinued
      });
    }
  }

  let categories = [...categoryById.values()].sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a.id).localeCompare(String(b.id), "ja");
  });

  if (usedRowKbnImport && rowStruct?.detected) {
    const usedIds = new Set();
    for (const m of masters) {
      const id = String(m.koshu2_id || "").trim();
      if (id && id !== "0") usedIds.add(id);
    }
    for (const p of rowStruct.seedPatches || []) {
      const id = String(p.id || "").trim();
      if (id) usedIds.add(id);
    }
    const before = categories.length;
    categories = categories.filter((c) => usedIds.has(String(c.id)));
    if (before > categories.length) {
      warnings.push(
        `row_kbn 取込: ページ内プルダウンの全工種（${before} 件）ではなく、本見積で実際に使われた区分 ${categories.length} 件に絞りました（余分なカスタム工種の登録を抑止）。`
      );
    }
  }

  if (!categories.length && masters.length) {
    warnings.push("工種プルダウンが見つかりませんでした。明細のみ取り込み、区分は先頭行の select または既定値を使用します。");
  }
  if (!masters.length && categories.length) {
    warnings.push("明細行（表）が検出されませんでした。工種のみ取り込みます。");
  }
  if (masters.length && !constructionTitle) {
    warnings.push("工事名（件名）入力が見つかりませんでした。画面上部の工事名は手動で合わせてください。");
  }
  if (useSectionBinding && sectionDefinitions.length) {
    warnings.push(
      `表内見出しで工事区分を ${sectionDefinitions.length} ブロック認識し、明細を順に紐付けました: ${sectionDefinitions.map((s) => s.label).join(" → ")}`
    );
  }
  const seedHeaderPatches = [...seedPatchById.values()];
  if (seedHeaderPatches.length) {
    warnings.push(
      `HTML の工事見出しに合わせ既定工事区分の表示名を更新: ${seedHeaderPatches.map((p) => `${p.id}=${p.label}`).join(", ")}`
    );
  }
  if (!usedRowKbnImport && docHasSectionHeader) {
    warnings.push(
      "文書内に工事見出しがあるため、行に工種 select が無い明細は「品名からの推定」に頼り、推定できない行は取り込みません（すべて先頭のクロス区分に寄せません）。"
    );
  }

  return {
    categories,
    sectionDefinitions,
    seedHeaderPatches,
    masters,
    warnings,
    constructionTitle,
    estateName,
    roomNo,
    useSectionBinding,
    usedRowKbnImport,
    structurePreview,
    workPackages
  };
}

/** シードに無い工種 id のみカスタム登録用に返す */
export function filterNewKoshuCategoriesForCustom(parsedCategories) {
  const out = [];
  for (const c of parsedCategories) {
    if (!SEED_IDS.has(String(c.id))) out.push(c);
  }
  return out;
}
