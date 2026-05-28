import React, { useCallback, useMemo, useRef, useState } from "react";
import { parseHasekoHtmlToKojiAndMeisai } from "./htmlKojiParse.js";
import { HasekoMitsumoriPreview } from "./HasekoMitsumoriPreview.jsx";
import {
  documentSubtotal,
  dxItemsToQuoteDocument,
  lineAmount,
  normalizeQuoteDocument,
  packageSubtotal,
  parsedHtmlToQuoteDocument,
  quoteDocumentToGridRows,
  newQuoteId
} from "./quoteDocumentModel.js";
import { buildExportRows, flattenExportToMatrix, EXPORT_HEADERS, validateExportRows } from "../exportUtils.js";
import * as XLSX from "xlsx";

function fmtYen(n) {
  return `¥${Math.round(Number(n) || 0).toLocaleString("ja-JP")}`;
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="dx-switch">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => { e.stopPropagation(); onChange(); }} onClick={(e) => e.stopPropagation()} />
      <span className="dx-slider" />
    </label>
  );
}

export function QuoteTabletShell({
  doc: docProp, meta = {}, templates = [],
  onDocChange, onSaveRoom, onSaveAsTemplate, onBack
}) {
  const [doc, setDoc] = useState(() => normalizeQuoteDocument(docProp));
  const [focusPkgId, setFocusPkgId] = useState(() => docProp?.packages?.[0]?.id || "");
  const [showPreview, setShowPreview] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [htmlPaste, setHtmlPaste] = useState("");
  const [expandedLines, setExpandedLines] = useState(() => new Set());
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const syncDoc = useCallback((next) => {
    const n = normalizeQuoteDocument(next);
    setDoc(n);
    if (n.packages[0] && !n.packages.some((p) => p.id === focusPkgId)) setFocusPkgId(n.packages[0].id);
    onDocChange?.(n);
  }, [onDocChange, focusPkgId]);

  const subtotal = useMemo(() => documentSubtotal(doc), [doc]);
  const tax = Math.floor(subtotal * 0.1);
  const grand = subtotal + tax;

  const patchLine = (pkgId, lineId, patch) => {
    syncDoc({ ...doc, packages: doc.packages.map((p) => p.id !== pkgId ? p : { ...p, lines: p.lines.map((ln) => ln.id === lineId ? { ...ln, ...patch } : ln) }) });
  };

  const togglePkg = (pkgId) => {
    const pkg = doc.packages.find((p) => p.id === pkgId);
    if (!pkg) return;
    const v = !pkg.active;
    syncDoc({ ...doc, packages: doc.packages.map((p) => p.id !== pkgId ? p : { ...p, active: v, lines: p.lines.map((ln) => ({ ...ln, active: v })) }) });
  };

  const toggleLineExpand = (id) => setExpandedLines((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const applyTemplate = (tpl) => {
    if (!tpl) return;
    const imported = tpl.quoteDoc ? normalizeQuoteDocument({ ...tpl.quoteDoc, meta: { ...tpl.quoteDoc.meta, ...meta } }) : dxItemsToQuoteDocument(tpl.items || [], meta);
    syncDoc(imported); if (imported.packages[0]) setFocusPkgId(imported.packages[0].id);
    setTplOpen(false); setMsg(`テンプレート「${tpl.name}」を反映`);
  };

  const applyHtml = (html) => {
    const trimmed = String(html || "").trim();
    if (!trimmed) { setMsg("HTML が空です"); return; }
    try {
      const parsed = parseHasekoHtmlToKojiAndMeisai(trimmed);
      const imported = parsedHtmlToQuoteDocument(parsed, meta);
      if (!imported.packages.length) { setMsg("取込できませんでした"); return; }
      syncDoc(imported); setFocusPkgId(imported.packages[0].id); setShowImport(false);
      setMsg(`${imported.packages.length} 工事を HTML から取込`);
    } catch (e) { setMsg(`取込エラー: ${e?.message || e}`); }
  };

  const exportXlsx = () => {
    const gridRows = quoteDocumentToGridRows(doc);
    const exportRows = buildExportRows(gridRows);
    const errors = validateExportRows(exportRows);
    if (errors.length) { setMsg(errors[0]); return; }
    const matrix = [EXPORT_HEADERS, ...flattenExportToMatrix(exportRows)];
    const ws = XLSX.utils.aoa_to_sheet(matrix); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "見積");
    XLSX.writeFile(wb, `${[meta.estateName, meta.roomNo].filter(Boolean).join("_") || "見積"}_export.xlsx`);
    setMsg("xlsx をダウンロードしました");
  };

  const exportJson = () => {
    const gridRows = quoteDocumentToGridRows(doc);
    const payload = { version: 1, project: meta, quoteDoc: doc, exportRows: buildExportRows(gridRows) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "haseko_quote_import.json"; a.click(); URL.revokeObjectURL(a.href);
    setMsg("JSON（長谷工導入用）を出力");
  };

  const addLine = (pkgId) => {
    const ln = { id: newQuoteId("ln"), active: true, item_name: "", basho: "", bui: "", koji_naiyo: "", quantity: 1, unit: "式", unit_price: 0, lineKind: "main", fields: {} };
    syncDoc({ ...doc, packages: doc.packages.map((p) => p.id !== pkgId ? p : { ...p, lines: [...p.lines, ln] }) });
  };

  const removeLine = (pkgId, lineId) => {
    if (!window.confirm("削除しますか？")) return;
    syncDoc({ ...doc, packages: doc.packages.map((p) => p.id !== pkgId ? p : { ...p, lines: p.lines.filter((ln) => ln.id !== lineId) }) });
  };

  const roomTitle = [meta.estateName, meta.roomNo].filter(Boolean).join(" ") || "現場見積";

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button type="button" className="text-slate-400 hover:text-slate-600 transition mr-1" onClick={onBack}>
              <i className="fa-solid fa-arrow-left text-lg" />
            </button>
          )}
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <i className="fa-solid fa-bolt text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{roomTitle}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">HASEKO DX</span>
              <span className="text-xs font-medium text-slate-400">見積作成中</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right flex items-end gap-3">
            <span className="text-sm text-slate-500 font-bold mb-1">税込合計</span>
            <span className="text-3xl font-black text-slate-900 num-font tracking-tight">{fmtYen(grand)}</span>
          </div>
          <button type="button" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
            onClick={() => onSaveRoom?.(doc)}>
            <i className="fa-solid fa-check" /> 保存
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex flex-wrap items-center gap-2 shrink-0">
        <button type="button" className="editor-tool-btn" onClick={() => setTplOpen(true)}>
          <i className="fa-solid fa-clock-rotate-left text-green-600" /> テンプレ反映
        </button>
        <button type="button" className={`editor-tool-btn ${showImport ? "primary" : ""}`} onClick={() => setShowImport((v) => !v)}>
          <i className="fa-solid fa-file-code" /> HTML取込
        </button>
        <button type="button" className="editor-tool-btn" onClick={() => { const n = window.prompt("テンプレート名", "現場テンプレ"); if (n?.trim()) onSaveAsTemplate?.(n.trim(), doc); }}>
          <i className="fa-solid fa-bookmark text-violet-500" /> テンプレ保存
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <button type="button" className="editor-tool-btn" onClick={() => setShowPreview(true)}>
          <i className="fa-solid fa-eye text-blue-500" /> プレビュー
        </button>
        <button type="button" className="editor-tool-btn" onClick={() => window.alert("印刷は今後実装予定です")}>
          <i className="fa-solid fa-print text-slate-400" /> 印刷
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <button type="button" className="editor-tool-btn" onClick={exportXlsx}><i className="fa-solid fa-file-excel text-green-600" /> xlsx</button>
        <button type="button" className="editor-tool-btn" onClick={exportJson}><i className="fa-solid fa-file-export text-orange-500" /> 長谷工導入</button>
        {msg && <span className="ml-auto text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">{msg}</span>}
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 shrink-0">
          <textarea className="w-full min-h-[60px] rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-[11px] focus:border-blue-400 focus:outline-none"
            placeholder="長谷工の見積登録ページの HTML を貼り付け" value={htmlPaste} onChange={(e) => setHtmlPaste(e.target.value)} />
          <div className="flex gap-2 mt-1.5">
            <button type="button" className="editor-tool-btn primary" disabled={!htmlPaste.trim()} onClick={() => applyHtml(htmlPaste)}>解析して反映</button>
            <button type="button" className="editor-tool-btn" onClick={() => fileRef.current?.click()}>
              <i className="fa-solid fa-file-arrow-up" /> .html
            </button>
            <input ref={fileRef} type="file" accept=".html,text/html" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader(); r.onload = () => applyHtml(String(r.result || "")); r.readAsText(f, "UTF-8"); e.target.value = "";
            }} />
          </div>
        </div>
      )}

      {/* Main: Airtable-style Grid */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto bg-white border-x border-slate-100">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: 56 }} className="text-center">ON/OFF</th>
                <th style={{ width: 140 }}>場所 / 内訳</th>
                <th style={{ minWidth: 220 }}>工事内容・明細</th>
                <th style={{ width: 130 }} className="text-right">数量</th>
                <th style={{ width: 110 }} className="text-right">単価(¥)</th>
                <th style={{ width: 120 }} className="text-right">金額(¥)</th>
                <th style={{ width: 64 }} className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {doc.packages.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-sm text-slate-400">
                  テンプレートまたはHTMLから工事を読込んでください
                </td></tr>
              ) : (
                doc.packages.map((pkg) => {
                  const pkgAmt = packageSubtotal(pkg);
                  return (
                    <React.Fragment key={pkg.id}>
                      {/* Category Header */}
                      <tr className="cat-header-row">
                        <td colSpan={7} style={{ padding: "10px 16px" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Toggle checked={pkg.active} onChange={() => togglePkg(pkg.id)} />
                              <i className="fa-solid fa-layer-group text-blue-500" />
                              <span className="font-bold text-lg text-blue-900 truncate">{pkg.title}</span>
                              {pkg.daiBunrui && <span className="text-[10px] text-slate-400 ml-1">{pkg.daiBunrui}</span>}
                              <span className="text-xs text-slate-400 num-font ml-auto mr-3">{fmtYen(pkgAmt)}</span>
                            </div>
                            <button type="button" className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                              onClick={() => addLine(pkg.id)}>
                              ＋ 明細追加
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Detail Rows */}
                      {pkg.lines.map((ln) => {
                        const amt = lineAmount(ln);
                        const dim = !pkg.active || !ln.active;
                        const isExpanded = expandedLines.has(ln.id);

                        return (
                          <React.Fragment key={ln.id}>
                            <tr className={`group transition-colors ${dim ? "row-inactive" : ""}`}>
                              <td className="text-center" style={{ width: 56 }}>
                                <Toggle checked={ln.active && pkg.active} disabled={!pkg.active}
                                  onChange={() => patchLine(pkg.id, ln.id, { active: !ln.active })} />
                              </td>
                              <td>
                                <input type="text" className="ghost-input text-sm font-semibold text-slate-600 bg-slate-50 rounded-md"
                                  value={[ln.basho, ln.bui].filter(Boolean).join(" / ")} disabled={dim} placeholder="場所"
                                  onChange={(e) => {
                                    const parts = e.target.value.split(/[\/／]/);
                                    patchLine(pkg.id, ln.id, { basho: (parts[0] || "").trim(), bui: (parts[1] || "").trim() });
                                  }} />
                              </td>
                              <td>
                                <input type="text" className="ghost-input font-bold text-slate-800"
                                  value={ln.item_name} disabled={dim} placeholder="工事内容を入力"
                                  onChange={(e) => patchLine(pkg.id, ln.id, { item_name: e.target.value })} />
                              </td>
                              <td>
                                <div className="flex items-center justify-end gap-1">
                                  <input type="number" className="ghost-input num-font text-right font-bold w-16"
                                    value={ln.quantity} disabled={dim}
                                    onChange={(e) => patchLine(pkg.id, ln.id, { quantity: parseFloat(e.target.value) || 0 })} />
                                  <input type="text" className="ghost-input text-center text-xs text-slate-500 w-10 px-1"
                                    value={ln.unit} disabled={dim}
                                    onChange={(e) => patchLine(pkg.id, ln.id, { unit: e.target.value })} />
                                </div>
                              </td>
                              <td>
                                <input type="number" className="ghost-input num-font text-right text-slate-800 w-full font-bold"
                                  value={ln.unit_price} disabled={dim} placeholder="0"
                                  onChange={(e) => patchLine(pkg.id, ln.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                              </td>
                              <td className="text-right pr-4">
                                <span className="grid-amount">{fmtYen(amt)}</span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button type="button" className="row-action-btn" title="詳細" onClick={() => toggleLineExpand(ln.id)}>
                                    <i className="fa-solid fa-sliders" />
                                  </button>
                                  <button type="button" className="row-action-btn danger" title="削除" onClick={() => removeLine(pkg.id, ln.id)}>
                                    <i className="fa-regular fa-trash-can" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable sub-row */}
                            {isExpanded && (
                              <tr className="sub-row">
                                <td />
                                <td colSpan={6}>
                                  <div className="flex flex-wrap items-end gap-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">施工内容</label>
                                      <input type="text" className="sub-input w-36" value={ln.koji_naiyo || ""} disabled={dim}
                                        placeholder="施工内容"
                                        onChange={(e) => patchLine(pkg.id, ln.id, { koji_naiyo: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">場所</label>
                                      <input type="text" className="sub-input w-24" value={ln.basho || ""} disabled={dim}
                                        onChange={(e) => patchLine(pkg.id, ln.id, { basho: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">部位</label>
                                      <input type="text" className="sub-input w-24" value={ln.bui || ""} disabled={dim}
                                        onChange={(e) => patchLine(pkg.id, ln.id, { bui: e.target.value })} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] z-20">
        <div className="text-right flex items-end gap-3">
          <span className="text-sm text-slate-400 mb-0.5 num-font">小計 {fmtYen(subtotal)} + 税 {fmtYen(tax)}</span>
          <span className="text-2xl font-black text-slate-900 num-font">{fmtYen(grand)}</span>
        </div>
        <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
          onClick={() => setShowPreview(true)}>
          <i className="fa-solid fa-check" /> 見積確認
        </button>
      </div>

      {/* Template Selector */}
      {tplOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40">
          <div className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">テンプレート選択</h3>
              <button type="button" className="text-2xl text-slate-400" onClick={() => setTplOpen(false)}>×</button>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">保存済みテンプレートがありません</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <button key={t.id} type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-left hover:bg-slate-100 transition-colors"
                    onClick={() => applyTemplate(t)}>
                    <div>
                      <div className="font-bold text-slate-800">{t.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {(t.quoteDoc?.packages?.length ?? t.items?.length ?? 0) > 0 ? `${t.quoteDoc?.packages?.length ?? "—"} 工事` : "空"}
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[210] flex flex-col bg-black/50 p-3 pt-12">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold text-slate-900">御見積プレビュー</h3>
              <button type="button" className="editor-tool-btn" onClick={() => setShowPreview(false)}>閉じる</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <HasekoMitsumoriPreview doc={doc} meta={meta} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
