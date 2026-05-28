/**
 * 現場立会後の構造化出力（JSON / WinActor・RPA 用 CSV）
 * 巡検状態: localStorage key dx-inspection-draft-v1（InspectionProShell の onSaveState と同期）
 */

export const INSPECTION_DRAFT_KEY = "dx-inspection-draft-v1";

export function loadInspectionDraft() {
  try {
    const raw = localStorage.getItem(INSPECTION_DRAFT_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

/** selKey: m-{id}（数値 id または tmp-* 等の文字列 id） */
function masterKeyFromSelKey(selKey) {
  return String(selKey).replace(/^m-/, "");
}

/**
 * @param {{ selected?: object }} draft
 * @param {Array<{ id: unknown, koshu2_id?: unknown, item_name?: string, unit?: string, unit_price?: unknown }>} masters
 */
export function buildRpaRowsFromDraft(draft, masters) {
  const list = Array.isArray(masters) ? masters : [];
  const byId = new Map();
  for (const m of list) {
    const sid = String(m.id ?? "");
    if (sid) byId.set(sid, m);
    const id = Number(m.id);
    if (Number.isFinite(id)) byId.set(id, m);
  }
  const selected = draft?.selected && typeof draft.selected === "object" ? draft.selected : {};
  return Object.entries(selected).map(([key, sel]) => {
    const raw = masterKeyFromSelKey(key);
    const m = byId.get(raw) ?? byId.get(Number(raw));
    const mid = m != null ? String(m.id ?? raw) : raw;
    const qty = Number(sel?.quantity ?? 0);
    const price = Number(m?.unit_price ?? 0);
    const lineAmt = Number.isFinite(qty) && Number.isFinite(price) ? Math.round(qty * price) : "";
    return {
      excel_row_key: key,
      master_id: mid,
      koshu2_id: m?.koshu2_id ?? "",
      item_name: m?.item_name ?? "",
      basho: sel?.basho ?? "",
      quantity: sel?.quantity ?? "",
      unit: m?.unit ?? "",
      unit_price: m?.unit_price ?? "",
      line_amount_hint: lineAmt,
      maker: sel?.maker ?? "",
      model: sel?.model ?? ""
    };
  });
}

export function rpaRowsToCsv(rows) {
  if (!rows.length) return "excel_row_key,master_id,koshu2_id,item_name,basho,quantity,unit,unit_price,line_amount_hint,maker,model\n";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

/**
 * @param {{
 *   project: { estateName?: string; roomNo?: string; workTitle?: string };
 *   catalogRows?: unknown[];
 *   masters?: unknown[];
 *   notes?: string;
 * }} p
 */
export function buildSiteMeetBundle(p) {
  const draft = loadInspectionDraft();
  const masters = Array.isArray(p.masters) ? p.masters : [];
  const rpaRows = buildRpaRowsFromDraft(draft, masters);
  return {
    schemaVersion: 1,
    workflow: "site_meet_then_quote",
    exportedAt: new Date().toISOString(),
    product: "haseko-react-prototype / excel-grid",
    project: {
      estateName: p.project?.estateName ?? "",
      roomNo: p.project?.roomNo ?? "",
      workTitle: p.project?.workTitle ?? ""
    },
    inspection: {
      selected: draft.selected ?? {},
      koshuNotNeeded: draft.koshuNotNeeded ?? {},
      roomGroupNa: draft.roomGroupNa ?? {},
      lineOrderByKoshu: draft.lineOrderByKoshu ?? {},
      scratchPoolMasters: draft.scratchPoolMasters ?? [],
      poolHiddenMasterIds: draft.poolHiddenMasterIds ?? []
    },
    meisaiCatalogRows: Array.isArray(p.catalogRows) ? p.catalogRows : [],
    mastersCount: masters.length,
    rpa_rows: rpaRows,
    notes: p.notes || "先に「保存」してからエクスポート。長谷工本番は公式フォーマット／別途 RPA。"
  };
}

export function downloadTextFile(filename, text, mime = "application/octet-stream") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
