import { HASEKO_KOSHU2_SEED, formatKoshuLine, coalesceKoshuPairWithSeed } from "./hasekoKoshu2Seed.js";

const LS_HIDDEN = "dx-koshu2-hidden-v1";
const LS_OVERRIDE = "dx-koshu2-override-v1";
const LS_CUSTOM = "dx-koshu2-custom-v1";

function safeParse(raw, fallback) {
  try {
    const o = JSON.parse(raw);
    return o ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadHiddenKoshuIds() {
  const arr = safeParse(localStorage.getItem(LS_HIDDEN) || "[]", []);
  return new Set((Array.isArray(arr) ? arr : []).map(String));
}

export function saveHiddenKoshuIds(set) {
  localStorage.setItem(LS_HIDDEN, JSON.stringify([...set]));
}

export function loadKoshuOverrides() {
  const o = safeParse(localStorage.getItem(LS_OVERRIDE) || "{}", {});
  return o && typeof o === "object" && !Array.isArray(o) ? o : {};
}

export function saveKoshuOverrides(obj) {
  localStorage.setItem(LS_OVERRIDE, JSON.stringify(obj));
}

export function loadKoshuCustom() {
  const arr = safeParse(localStorage.getItem(LS_CUSTOM) || "[]", []);
  return Array.isArray(arr) ? arr : [];
}

export function saveKoshuCustom(arr) {
  localStorage.setItem(LS_CUSTOM, JSON.stringify(arr));
}

function seedToCategory(row) {
  const o = loadKoshuOverrides()[String(row.id)] || {};
  const { label, koshu2_text } = coalesceKoshuPairWithSeed(o, row);
  return {
    id: String(row.id),
    label,
    koshu2_text,
    discontinued: Boolean(row.discontinued),
    isCustom: false,
    name: formatKoshuLine({ label, koshu2_text })
  };
}

/**
 * 巡検・オフライン用の categories 配列を生成
 * @param {Array<{ id: unknown, name?: string }>|null|undefined} serverCategories API から来た区分（空ならシード）
 * @param {boolean} preferSeed true のとき API 区分があってもシード＋編集を土台にする（デモ時）
 */
export function mergeKoshuCategoriesForUi(serverCategories, preferSeed) {
  const hidden = loadHiddenKoshuIds();
  const custom = loadKoshuCustom();

  let baseList = [];
  if (!preferSeed && Array.isArray(serverCategories) && serverCategories.length > 0) {
    baseList = serverCategories.map((c) => ({
      id: String(c.id),
      label: String(c.name || c.label || c.id),
      koshu2_text: String(c.koshu2_text || "").trim() || String(c.name || "").replace(/工事.*/, "").trim(),
      discontinued: Boolean(c.discontinued),
      isCustom: Boolean(c.isCustom),
      name: c.name || formatKoshuLine({ label: c.name, koshu2_text: c.koshu2_text })
    }));
  } else {
    baseList = HASEKO_KOSHU2_SEED.map(seedToCategory);
  }

  const byId = new Map(baseList.map((c) => [String(c.id), c]));
  for (const row of custom) {
    if (!row || row.id == null) continue;
    const id = String(row.id);
    if (hidden.has(id)) continue;
    const htmlOrder = row.htmlImportOrder;
    byId.set(id, {
      id,
      label: String(row.label || ""),
      koshu2_text: String(row.koshu2_text || ""),
      discontinued: Boolean(row.discontinued),
      isCustom: true,
      htmlImportOrder: Number.isFinite(Number(htmlOrder)) ? Number(htmlOrder) : undefined,
      name: formatKoshuLine({ label: row.label, koshu2_text: row.koshu2_text })
    });
  }

  const out = [...byId.values()].filter((c) => !hidden.has(String(c.id)));

  /** 0=既定区分 1=HTML 取込順のカスタム 2=その他カスタム */
  function sortTier(c) {
    if (!c.isCustom) return 0;
    if (Number.isFinite(c.htmlImportOrder)) return 1;
    return 2;
  }

  out.sort((a, b) => {
    const ta = sortTier(a);
    const tb = sortTier(b);
    if (ta !== tb) return ta - tb;

    if (ta === 0) {
      const na = Number(a.id);
      const nb = Number(b.id);
      if (Number.isFinite(na) && Number.isFinite(nb) && String(a.id) === String(na) && String(b.id) === String(nb)) {
        return na - nb;
      }
    }
    if (ta === 1) {
      const d = a.htmlImportOrder - b.htmlImportOrder;
      if (d !== 0) return d;
    }
    return String(a.id).localeCompare(String(b.id), "ja");
  });
  return out;
}
