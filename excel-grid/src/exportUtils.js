import { CATEGORY_DEFS, EXPORT_HEADERS, SUITO_HINBAN } from "./constants.js";

export const normalizeWallpaperName = (value) =>
  String(value || "")
    .replace(/\(量産品\)|（量産品）|量産品/g, "")
    .replace(/クロス貼替え/g, "クロス貼替")
    .trim();

/**
 * プリセット断片から明細行を生成
 */
export function createRow(patch = {}) {
  const def = CATEGORY_DEFS.find((c) => c.id === (patch.categoryId || "wallpaper")) || CATEGORY_DEFS[0];
  const suryo = Number(patch.suryo ?? 0);
  const tanka = Number(patch.tanka ?? 0);
  const price = Math.round(suryo * tanka);
  const ownerRate = Number(patch.ownerRate ?? 100);
  const tenantRate = Number(patch.tenantRate ?? 0);
  const taisho1Raw = patch.taisho1 ?? "";
  const taisho1 = def.id === "wallpaper" ? normalizeWallpaperName(taisho1Raw) : taisho1Raw;
  return {
    id: crypto.randomUUID(),
    rowType: String(patch.rowType || "meisai"),
    linePreset: String(patch.linePreset ?? ""),
    hinbanKey: String(patch.hinbanKey ?? ""),
    categoryId: def.id,
    koshu1_text: def.koshu1_text,
    koshu2_text: def.koshu2_text,
    koshu2_koban: String(patch.koshu2_koban ?? ""),
    sel_koshu2_cd: def.sel_koshu2_cd,
    taisho1,
    taisho2: String(patch.taisho2 ?? ""),
    koji_naiyo: String(patch.koji_naiyo ?? ""),
    basho: String(patch.basho ?? ""),
    bui: String(patch.bui ?? ""),
    zumen_suryo: String(patch.zumen_suryo ?? ""),
    suryo,
    tani: String(patch.tani ?? "㎡"),
    tanka,
    price,
    ownerRate,
    tenantRate,
    ownerCost: Math.round((price * ownerRate) / 100),
    tenantCost: Math.round((price * tenantRate) / 100),
    biko1: String(patch.biko1 ?? ""),
    maker: String(patch.maker ?? ""),
    type: String(patch.type ?? ""),
    comment: String(patch.comment ?? "")
  };
}

/**
 * 階層見出し行：画面用のみ、エクスポート対象外
 */
export function createSectionHeaderRow(categoryId) {
  const def = CATEGORY_DEFS.find((c) => c.id === categoryId) || CATEGORY_DEFS[0];
  return {
    id: crypto.randomUUID(),
    rowType: "section_header",
    linePreset: "",
    hinbanKey: "",
    categoryId: def.id,
    koshu1_text: def.koshu1_text,
    koshu2_text: def.koshu2_text,
    koshu2_koban: "",
    sel_koshu2_cd: def.sel_koshu2_cd,
    taisho1: `━━ ${def.label}（階層）━━`,
    taisho2: "",
    koji_naiyo: "",
    basho: "",
    bui: "",
    zumen_suryo: "",
    suryo: 0,
    tani: "—",
    tanka: 0,
    price: 0,
    ownerRate: 0,
    tenantRate: 0,
    ownerCost: 0,
    tenantCost: 0,
    biko1: "区分見出し行（表示のみ・エクスポートしません）。",
    maker: "",
    type: "",
    comment: ""
  };
}

export function withComputedAmounts(row) {
  if (row.rowType === "section_header") {
    return { ...row, suryo: 0, tanka: 0, price: 0, ownerCost: 0, tenantCost: 0, ownerRate: 0, tenantRate: 0 };
  }
  const suryo = Number(row.suryo || 0);
  const tanka = Number(row.tanka || 0);
  const price = Math.round(suryo * tanka);
  const ownerRate = Number(row.ownerRate ?? 100);
  const tenantRate = Number(row.tenantRate ?? 0);
  return {
    ...row,
    price,
    ownerCost: Math.round((price * ownerRate) / 100),
    tenantCost: Math.round((price * tenantRate) / 100)
  };
}

/**
 * グリッド編集後：工種・水栓品番・クロス名称などを同期
 */
export function enrichRowForGrid(row) {
  if (row.rowType === "section_header") {
    return withComputedAmounts({ ...row });
  }
  if (row.linePreset === "faucet") {
    const wdef = CATEGORY_DEFS.find((c) => c.id === "water") || CATEGORY_DEFS[0];
    let next = {
      ...row,
      categoryId: "water",
      koshu1_text: wdef.koshu1_text,
      koshu2_text: wdef.koshu2_text,
      sel_koshu2_cd: wdef.sel_koshu2_cd,
      basho: row.basho || "キッチン",
      bui: row.bui || "水栓",
      koji_naiyo: row.koji_naiyo || "交換"
    };
    if (next.hinbanKey) {
      const p = SUITO_HINBAN.find((x) => x.key === next.hinbanKey);
      if (p) {
        next = {
          ...next,
          taisho1: p.taisho1,
          tani: p.tani,
          tanka: p.tanka,
          type: p.code,
          maker: p.name,
          biko1: `品番 ${p.code} / ${p.name}`
        };
      }
    } else {
      next = {
        ...next,
        taisho1: "水栓交換（品番を選択してください）",
        tani: "式",
        tanka: 0,
        type: "",
        maker: ""
      };
    }
    return withComputedAmounts(next);
  }
  const def = CATEGORY_DEFS.find((c) => c.id === row.categoryId) || CATEGORY_DEFS[0];
  const taisho1 = def.id === "wallpaper" ? normalizeWallpaperName(row.taisho1) : row.taisho1;
  return withComputedAmounts({
    ...row,
    linePreset: "",
    hinbanKey: "",
    koshu1_text: def.koshu1_text,
    koshu2_text: def.koshu2_text,
    sel_koshu2_cd: def.sel_koshu2_cd,
    taisho1
  });
}

/**
 * 画面行を row_kbn 1/2/3 構造へフラット化（インポート用）
 */
function isMeisaiRow(row) {
  return row.rowType !== "section_header";
}

export function buildExportRows(activeRows) {
  const forExport = activeRows.filter(isMeisaiRow);
  const grouped = forExport.reduce((acc, row) => {
    if (!acc[row.categoryId]) acc[row.categoryId] = [];
    acc[row.categoryId].push(row);
    return acc;
  }, {});

  const output = [];
  Object.entries(grouped).forEach(([categoryId, groupRows]) => {
    const def = CATEGORY_DEFS.find((c) => c.id === categoryId);
    if (!def) return;
    output.push({ row_kbn: "1", koshu1_text: def.koshu1_text });
    output.push({
      row_kbn: "2",
      koshu2_koban: "",
      sel_koshu2_cd: def.sel_koshu2_cd,
      koshu2_text: def.koshu2_text
    });
    groupRows.forEach((r) => {
      const meisai = {
        row_kbn: "3",
        taisho1: r.taisho1,
        taisho2: r.taisho2,
        koji_naiyo: r.koji_naiyo,
        basho: r.basho,
        bui: r.bui,
        zumen_suryo: r.zumen_suryo,
        suryo: String(r.suryo),
        tani: r.tani,
        tanka: String(r.tanka),
        kakaku: String(r.price),
        kashinushi_futan_wariai: Number(r.ownerRate || 0).toFixed(2),
        kashinushi_futan_kingaku: String(r.ownerCost || 0),
        karinushi_futan_wariai: Number(r.tenantRate || 0).toFixed(2),
        karinushi_futan_kingaku: String(r.tenantCost || 0),
        biko1: r.biko1,
        maker: r.maker,
        type: r.type,
        comment: r.comment
      };
      output.push(meisai);
      if (r.comment && String(r.comment).trim()) {
        output.push({ row_kbn: "4", comment: String(r.comment).trim() });
      }
    });
  });
  return output;
}

export function validateExportRows(dataRows) {
  const errors = [];
  dataRows.forEach((row, index) => {
    const rowNo = index + 1;
    if (!row.row_kbn) {
      errors.push(`${rowNo}行目: row_kbn がありません`);
      return;
    }
    if (row.row_kbn === "1" && !row.koshu1_text) errors.push(`${rowNo}行目(row_kbn=1): koshu1_text がありません`);
    if (row.row_kbn === "2" && !row.koshu2_text) errors.push(`${rowNo}行目(row_kbn=2): koshu2_text がありません`);
    if (row.row_kbn === "3") {
      ["taisho1", "suryo", "tani", "tanka", "kakaku"].forEach((key) => {
        if (row[key] === undefined || row[key] === null || String(row[key]).trim() === "") {
          errors.push(`${rowNo}行目(row_kbn=3): ${key} がありません`);
        }
      });
    }
    if (row.row_kbn === "4" && (!row.comment || !String(row.comment).trim())) {
      errors.push(`${rowNo}行目(row_kbn=4): comment がありません`);
    }
  });
  return errors;
}

/** エクスポート行を TSV/Excel 1行1レコードへ。ヘッダは EXPORT_HEADERS */
export function flattenExportToMatrix(exportRows) {
  return exportRows.map((row) => EXPORT_HEADERS.map((h) => (row[h] !== undefined && row[h] !== null ? row[h] : "")));
}

export { EXPORT_HEADERS };
