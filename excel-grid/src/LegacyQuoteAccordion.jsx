import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_DEFS, LINE_PRESET_OPTIONS, SUITO_HINBAN } from "./constants.js";
import { enrichRowForGrid } from "./exportUtils.js";

/** ㎡・ｍ などは 0.1 刻み、それ以外は 1 刻み */
function quantityStepForRow(row) {
  const t = String(row?.tani || "");
  if (/[㎡ｍ]/u.test(t)) return 0.1;
  return 1;
}

function roundQty(q, step) {
  const n = Number(q);
  if (!Number.isFinite(n) || n < 0) return 0;
  const k = Math.round(n / step);
  const v = k * step;
  return step >= 1 ? v : Math.round(v * 1000) / 1000;
}

function QuantityStepper({ row, onCommit }) {
  const step = quantityStepForRow(row);
  const q = Number(row.suryo) || 0;
  const bump = (dir) => {
    onCommit(roundQty(q + dir * step, step));
  };
  return (
    <div className="flex max-w-[9rem] items-center gap-0.5">
      <button
        type="button"
        className="h-8 w-8 shrink-0 rounded border border-slate-400 bg-slate-100 text-lg font-bold leading-none text-slate-800 hover:bg-slate-200"
        aria-label="数量を減らす"
        onClick={() => bump(-1)}
      >
        −
      </button>
      <input
        className="h-8 min-w-0 flex-1 rounded border border-slate-300 px-1 text-center text-sm tabular-nums"
        inputMode="decimal"
        value={Number.isFinite(q) ? String(q) : "0"}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, "");
          if (raw === "" || raw === "-" || raw === ".") return;
          const n = parseFloat(raw);
          if (Number.isFinite(n)) onCommit(Math.max(0, n));
        }}
        onBlur={(e) => {
          const n = parseFloat(String(e.target.value).replace(/,/g, ""));
          if (Number.isFinite(n)) onCommit(roundQty(n, step));
        }}
      />
      <button
        type="button"
        className="h-8 w-8 shrink-0 rounded border border-slate-400 bg-slate-100 text-lg font-bold leading-none text-slate-800 hover:bg-slate-200"
        aria-label="数量を増やす"
        onClick={() => bump(1)}
      >
        +
      </button>
    </div>
  );
}

export function buildKoshuGroups(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const groups = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row.rowType === "section_header") {
      const def = CATEGORY_DEFS.find((c) => c.id === row.categoryId);
      const label = def?.label ?? row.categoryId;
      i += 1;
      const meisai = [];
      while (i < rows.length && rows[i].rowType !== "section_header") {
        meisai.push(rows[i]);
        i += 1;
      }
      groups.push({
        id: `hdr-${row.id}`,
        label: `〔階層〕${label}`,
        categoryId: row.categoryId,
        headerRow: row,
        meisai
      });
    } else {
      const catId = row.categoryId;
      const meisai = [];
      while (i < rows.length && rows[i].rowType !== "section_header" && rows[i].categoryId === catId) {
        meisai.push(rows[i]);
        i += 1;
      }
      const def = CATEGORY_DEFS.find((c) => c.id === catId);
      groups.push({
        id: `run-${meisai[0]?.id ?? `i-${i}`}`,
        label: def?.label ?? catId,
        categoryId: catId,
        headerRow: null,
        meisai
      });
    }
  }
  return groups;
}

function meisaiRowIndexMap(rows) {
  const m = new Map();
  let n = 0;
  for (const r of rows) {
    if (r.rowType !== "section_header") {
      n += 1;
      m.set(r.id, n);
    }
  }
  return m;
}

export function LegacyQuoteAccordion({ rows, onRowsChange }) {
  const groups = useMemo(() => buildKoshuGroups(rows), [rows]);
  const rowNumById = useMemo(() => meisaiRowIndexMap(rows), [rows]);

  const [openGroupId, setOpenGroupId] = useState("");
  useEffect(() => {
    setOpenGroupId((prev) => {
      if (!groups.length) return "";
      if (prev && groups.some((g) => g.id === prev)) return prev;
      return groups[0].id;
    });
  }, [groups]);

  const applyPatch = useCallback(
    (rowId, patch) => {
      onRowsChange(
        rows.map((r) => {
          if (r.id !== rowId) return r;
          return enrichRowForGrid({ ...r, ...patch });
        })
      );
    },
    [rows, onRowsChange]
  );

  const onCategoryChange = (row, categoryId) => {
    const def = CATEGORY_DEFS.find((c) => c.id === categoryId) || CATEGORY_DEFS[0];
    applyPatch(row.id, {
      categoryId: def.id,
      linePreset: row.linePreset === "faucet" ? row.linePreset : "",
      hinbanKey: row.linePreset === "faucet" ? row.hinbanKey : "",
      koshu1_text: def.koshu1_text,
      koshu2_text: def.koshu2_text,
      sel_koshu2_cd: def.sel_koshu2_cd
    });
  };

  if (!groups.length) {
    return <p className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">行がありません。テンプレ読込や区分追加から始められます。</p>;
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const open = openGroupId === g.id;
        const subtotal = g.meisai.reduce((s, r) => s + Number(r.price || 0), 0);
        const toggle = () => setOpenGroupId((cur) => (cur === g.id ? "" : g.id));

        return (
          <details
            key={g.id}
            open={open}
            className="overflow-hidden rounded-lg border-2 border-slate-400 bg-white shadow-sm open:border-emerald-700"
          >
            <summary
              className="cursor-pointer list-none bg-slate-200 px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden"
              onClick={(e) => {
                e.preventDefault();
                toggle();
              }}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className={`text-slate-600 transition-transform ${open ? "inline-block rotate-90" : ""}`} aria-hidden>
                  ▸
                </span>
                <span className="text-base font-bold text-slate-900">{g.label}</span>
                <span className="text-sm text-slate-600">
                  {g.meisai.length} 行 · 小計{" "}
                  <span className="font-semibold tabular-nums text-emerald-900">¥{subtotal.toLocaleString("ja-JP")}</span>
                </span>
              </span>
            </summary>
            <div className="divide-y divide-slate-200 border-t border-slate-200">
              {g.meisai.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">この区分に明細行はありません。</div>
              ) : (
                g.meisai.map((row) => {
                  const lineNo = rowNumById.get(row.id) ?? "—";
                  return (
                    <div key={row.id} className="bg-slate-50/80 p-3 text-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded bg-slate-200 px-1.5 text-xs font-bold tabular-nums text-slate-800">
                          行 {lineNo}
                        </span>
                        <label className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                          工種
                          <select
                            className="max-w-[10rem] rounded border border-slate-300 bg-white px-1 py-1 text-xs font-medium"
                            value={row.categoryId}
                            disabled={row.linePreset === "faucet"}
                            onChange={(e) => onCategoryChange(row, e.target.value)}
                          >
                            {CATEGORY_DEFS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                          子種別
                          <select
                            className="max-w-[9rem] rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                            value={row.linePreset || ""}
                            onChange={(e) => applyPatch(row.id, { linePreset: e.target.value, hinbanKey: "" })}
                          >
                            {LINE_PRESET_OPTIONS.map((o) => (
                              <option key={o.value || "none"} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {row.linePreset === "faucet" ? (
                          <label className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
                            品番
                            <select
                              className="max-w-[12rem] rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                              value={row.hinbanKey || ""}
                              onChange={(e) => applyPatch(row.id, { hinbanKey: e.target.value })}
                            >
                              <option value="">品番を選択…</option>
                              {SUITO_HINBAN.map((h) => (
                                <option key={h.key} value={h.key}>
                                  {h.code}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">名称(taisho1)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.taisho1 ?? ""}
                            disabled={row.linePreset === "faucet"}
                            onChange={(e) => applyPatch(row.id, { taisho1: e.target.value })}
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">場所(basho)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.basho ?? ""}
                            onChange={(e) => applyPatch(row.id, { basho: e.target.value })}
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">部位(bui)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.bui ?? ""}
                            onChange={(e) => applyPatch(row.id, { bui: e.target.value })}
                          />
                        </label>
                        <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">内容(koji_naiyo)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.koji_naiyo ?? ""}
                            onChange={(e) => applyPatch(row.id, { koji_naiyo: e.target.value })}
                          />
                        </label>
                        <div className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">数量（±）</span>
                          <QuantityStepper row={row} onCommit={(suryo) => applyPatch(row.id, { suryo })} />
                        </div>
                        <label className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">単位(tani)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.tani ?? ""}
                            disabled={row.linePreset === "faucet"}
                            onChange={(e) => applyPatch(row.id, { tani: e.target.value })}
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">単価(tanka)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                            type="number"
                            value={row.linePreset === "faucet" ? row.tanka ?? 0 : row.tanka ?? ""}
                            disabled={row.linePreset === "faucet"}
                            onChange={(e) => applyPatch(row.id, { tanka: parseFloat(e.target.value) || 0 })}
                          />
                        </label>
                        <div className="flex min-w-0 items-end">
                          <div className="w-full rounded border border-slate-200 bg-white px-2 py-2 text-right">
                            <div className="text-[11px] font-semibold text-slate-500">金額(自動)</div>
                            <div className="text-base font-bold tabular-nums text-emerald-900">
                              ¥{Number(row.price || 0).toLocaleString("ja-JP")}
                            </div>
                          </div>
                        </div>
                        <label className="block min-w-0 sm:col-span-2">
                          <span className="mb-0.5 block text-[11px] font-semibold text-slate-600">備考(biko1)</span>
                          <input
                            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                            value={row.biko1 ?? ""}
                            onChange={(e) => applyPatch(row.id, { biko1: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
