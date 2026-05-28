import React, { useCallback, useMemo, useRef, useState } from "react";
import { CATEGORY_DEFS, HASEKO_STANDARD_TEMPLATE } from "./constants.js";
import { createRow, enrichRowForGrid } from "./exportUtils.js";
import { parseHasekoHtmlToKojiAndMeisai } from "./dx/htmlKojiParse.js";
import { parseResultToGridRows } from "./dx/hasekoHtmlToGridRows.js";
import { MEISAI_BK_COLUMNS, meisaiLineToBkCells } from "./dx/tabletMeisaiBkColumns.js";

const SAMPLE_HTML_URL = "/haseko-samples/toyosu-1415.html";

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
  const bump = (dir) => onCommit(roundQty(q + dir * step, step));
  return (
    <div className="flex max-w-[9rem] items-center gap-0.5">
      <button
        type="button"
        className="h-7 w-7 shrink-0 rounded border border-slate-400 bg-slate-100 text-base font-bold leading-none text-slate-800 hover:bg-slate-200"
        aria-label="減"
        onClick={() => bump(-1)}
      >
        −
      </button>
      <input
        className="h-7 min-w-0 flex-1 rounded border border-slate-300 px-1 text-center text-xs tabular-nums"
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
        className="h-7 w-7 shrink-0 rounded border border-slate-400 bg-slate-100 text-base font-bold leading-none text-slate-800 hover:bg-slate-200"
        aria-label="増"
        onClick={() => bump(1)}
      >
        +
      </button>
    </div>
  );
}

function rowToMeisaiLine(row) {
  return {
    item_name: row.taisho1,
    basho: row.basho,
    quantity: row.suryo,
    unit: row.tani,
    unit_price: row.tanka,
    fields: {
      row_kbn: "3",
      koji_naiyo: row.koji_naiyo,
      taisho1: row.taisho1,
      taisho2: row.taisho2,
      basho: row.basho,
      bui: row.bui,
      suryo: String(row.suryo ?? ""),
      tani: row.tani,
      tanka: String(row.tanka ?? ""),
      biko1: row.biko1,
      maker: row.maker,
      type: row.type
    }
  };
}

function MeisaiBkMini({ row }) {
  const ln = rowToMeisaiLine(row);
  const cells = meisaiLineToBkCells(ln);
  return (
    <div className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white">
      <div className="grid min-w-[560px] grid-cols-10 divide-x divide-slate-200 border-b border-slate-200 bg-slate-100 text-[7px] font-semibold text-slate-600">
        {MEISAI_BK_COLUMNS.map((c) => (
          <div key={c.id} className="px-0.5 py-1 text-center leading-tight">
            {c.id}
          </div>
        ))}
      </div>
      <div className="grid min-w-[560px] grid-cols-10 divide-x divide-slate-100 text-[8px] text-slate-900">
        {MEISAI_BK_COLUMNS.map((c) => {
          const v = cells[`${c.id}_${c.label}`] || "—";
          return (
            <div key={c.id} className="max-h-20 overflow-y-auto px-0.5 py-1 text-left align-top leading-snug break-words">
              {v}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function currency(n) {
  return `${Number(n || 0).toLocaleString("ja-JP")} 円`;
}

export function GroupedQuoteBrief({ onBack }) {
  const [rows, setRows] = useState(() => HASEKO_STANDARD_TEMPLATE.map((p) => createRow(p)));
  const [focusCat, setFocusCat] = useState(CATEGORY_DEFS[0]?.id || "wallpaper");
  const [htmlPaste, setHtmlPaste] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const fileRef = useRef(null);

  const meisaiRows = useMemo(() => rows.filter((r) => r.rowType !== "section_header"), [rows]);

  const counts = useMemo(() => {
    const m = {};
    for (const c of CATEGORY_DEFS) m[c.id] = 0;
    for (const r of meisaiRows) {
      if (m[r.categoryId] != null) m[r.categoryId] += 1;
    }
    return m;
  }, [meisaiRows]);

  const subtotalMap = useMemo(() => {
    const m = {};
    for (const c of CATEGORY_DEFS) m[c.id] = 0;
    for (const r of meisaiRows) {
      if (m[r.categoryId] != null) m[r.categoryId] += Number(r.price || 0);
    }
    return m;
  }, [meisaiRows]);

  const groupRows = useMemo(() => meisaiRows.filter((r) => r.categoryId === focusCat), [meisaiRows, focusCat]);
  const cat = CATEGORY_DEFS.find((c) => c.id === focusCat) || CATEGORY_DEFS[0];

  const patchRow = useCallback((id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? enrichRowForGrid({ ...r, ...patch }) : r)));
  }, []);

  const addRow = () => {
    setRows((prev) => [...prev, enrichRowForGrid(createRow({ categoryId: focusCat, taisho1: "" }))]);
  };

  const removeRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const previewLines = useMemo(
    () =>
      groupRows.map((r) => ({
        id: r.id,
        title: String(r.taisho1 || "（無題）").trim(),
        basho: r.basho,
        amt: Number(r.price || 0)
      })),
    [groupRows]
  );

  const applyHtml = useCallback((html) => {
    const trimmed = String(html || "").trim();
    if (!trimmed) {
      setImportMsg("HTML が空です");
      return;
    }
    setImportBusy(true);
    try {
      const parsed = parseHasekoHtmlToKojiAndMeisai(trimmed);
      const { rows: imported, meta, importCount, focusCategoryId, usedRowKbn } = parseResultToGridRows(parsed);
      if (!importCount) {
        setImportMsg(
          (parsed.warnings || []).slice(0, 3).join(" · ") || "明細行を取り込めませんでした（row_kbn=3 を確認）"
        );
        return;
      }
      setRows(imported);
      setFocusCat(focusCategoryId);
      const metaBits = [meta.estateName, meta.roomNo].filter(Boolean).join(" ");
      setImportMsg(
        [
          `${importCount} 行を取込`,
          usedRowKbn ? "row_kbn 構造" : "表推定",
          metaBits ? `物件: ${metaBits}` : "",
          meta.constructionTitle ? `工事: ${meta.constructionTitle.slice(0, 40)}` : ""
        ]
          .filter(Boolean)
          .join(" · ")
      );
    } catch (e) {
      setImportMsg(`取込エラー: ${e?.message || e}`);
    } finally {
      setImportBusy(false);
    }
  }, []);

  const onImportPaste = () => applyHtml(htmlPaste);

  const onImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyHtml(String(reader.result || ""));
    reader.onerror = () => setImportMsg("ファイル読込に失敗しました");
    reader.readAsText(file, "UTF-8");
  };

  const loadSampleHtml = async () => {
    setImportBusy(true);
    setImportMsg("サンプル HTML を読込中…");
    try {
      const res = await fetch(SAMPLE_HTML_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      applyHtml(html);
    } catch (e) {
      setImportMsg(`サンプル読込失敗: ${e?.message || e}（public/haseko-samples を確認）`);
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-4">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold text-slate-900">2) 分组式見積編輯（簡介版）</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              左：<span className="font-medium text-slate-700">工事一覧</span> · 右：手风琴明細（B〜K）＋数量步进
            </p>
          </div>
          {onBack ? (
            <button type="button" className="haseko-btn-outline text-[12px]" onClick={onBack}>
              戻る
            </button>
          ) : null}
        </header>

        <section className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">長谷工「見積登録」HTML 取込</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={importBusy}
                className="rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                onClick={() => void loadSampleHtml()}
              >
                豊洲1415 サンプル
              </button>
              <button
                type="button"
                disabled={importBusy || !htmlPaste.trim()}
                className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                onClick={onImportPaste}
              >
                貼付を反映
              </button>
              <button
                type="button"
                disabled={importBusy}
                className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
              >
                .html ファイル
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".html,text/html"
                className="hidden"
                onChange={(e) => {
                  onImportFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <textarea
            className="mb-2 min-h-[4rem] w-full rounded border border-slate-300 bg-white px-2 py-1.5 font-mono text-[10px] leading-snug text-slate-800"
            placeholder="見積登録ページを「名前を付けて保存」した HTML を貼付（table#Costs・row_kbn[0] 形式）"
            value={htmlPaste}
            onChange={(e) => setHtmlPaste(e.target.value)}
          />
          {importMsg ? <p className="text-[11px] text-emerald-900">{importMsg}</p> : null}
          <p className="mt-1 text-[10px] text-slate-500">
            解析は既存 <code className="rounded bg-white px-1">parseHasekoHtmlToKojiAndMeisai</code>（row_kbn）を使用。取込後は左の工種別件数が更新されます。
          </p>
        </section>

        <section className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <aside className="flex w-full shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50/90 lg:w-[13.5rem]">
              <div className="border-b border-slate-200 bg-slate-100/80 px-2.5 py-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">工事一覧</div>
                <div className="mt-0.5 text-[10px] leading-snug text-slate-500">点击工种切换右侧编辑区</div>
              </div>
              <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-1.5 py-1.5">
                <ul className="space-y-0.5">
                  {CATEGORY_DEFS.map((c) => {
                    const n = counts[c.id] ?? 0;
                    const focused = focusCat === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setFocusCat(c.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition ${
                            focused
                              ? "border-slate-800 bg-white font-semibold text-slate-900 shadow-sm"
                              : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white"
                          }`}
                        >
                          <span className="min-w-0 truncate">{c.label}</span>
                          <span className="shrink-0 tabular-nums text-slate-500">{n}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-auto border-t border-slate-200 p-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full rounded border border-slate-400 bg-white py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                >
                  ＋ 当前工种に行追加
                </button>
              </div>
            </aside>

            <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
                <div className="text-sm font-semibold text-slate-900">工事</div>
                <div className="text-[11px] tabular-nums text-slate-600">
                  {cat.label} · 小计 {currency(subtotalMap[focusCat] || 0)} · {groupRows.length} 行
                </div>
              </div>
              {meisaiRows.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-slate-500">暂无明细。请导入，或左侧选工种后点「行追加」。</div>
              ) : groupRows.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-slate-500">
                  当前工种尚无行。
                  <button type="button" className="font-semibold text-slate-800 underline" onClick={addRow}>
                    追加一行
                  </button>
                </div>
              ) : (
                <div className="max-h-[min(70vh,28rem)] space-y-2 overflow-y-auto p-2">
                  {groupRows.map((row) => (
                    <details key={row.id} className="rounded-lg border border-slate-200 bg-slate-50/80 open:border-slate-400 open:bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-2 text-[12px] marker:hidden [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="text-slate-400" aria-hidden>
                            ▸
                          </span>
                          <span className="truncate font-semibold text-slate-900">{row.taisho1 || "（無題）"}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-800">{currency(row.price)}</span>
                      </summary>
                      <div className="border-t border-slate-100 px-2 pb-3 pt-1">
                        <MeisaiBkMini row={row} />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-semibold text-slate-600">数量（步进）</span>
                          <QuantityStepper row={row} onCommit={(suryo) => patchRow(row.id, { suryo })} />
                          <button
                            type="button"
                            className="ml-auto rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-800 hover:bg-rose-100"
                            onClick={() => removeRow(row.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <details className="group mt-3 rounded-lg border border-slate-300 bg-white shadow-sm open:shadow-md">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-t-lg px-3 py-2.5 text-sm font-medium text-slate-800 marker:hidden [&::-webkit-details-marker]:hidden hover:bg-slate-50">
            <span>
              <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">3)</span>
              御見積プレビュー（{cat.label}）
            </span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">与当前工种明細一致；可折叠以省屏</div>
          <div className="max-h-48 overflow-auto px-3 pb-3">
            {previewLines.length === 0 ? (
              <p className="text-xs text-slate-400">无行</p>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-1 pr-2">工事项</th>
                    <th className="py-1 pr-2">場所</th>
                    <th className="py-1 text-right">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLines.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="py-1 pr-2 font-medium text-slate-800">{l.title}</td>
                      <td className="py-1 pr-2 text-slate-600">{l.basho || "—"}</td>
                      <td className="py-1 text-right tabular-nums font-semibold text-slate-900">{currency(l.amt)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-slate-900">
                    <td colSpan={2} className="pt-2 text-right">
                      小计
                    </td>
                    <td className="pt-2 text-right tabular-nums">{currency(subtotalMap[focusCat] || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
