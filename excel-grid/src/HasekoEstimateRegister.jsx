import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HasekoCostsSummary, HasekoCostsTable } from "./HasekoCostsTable.jsx";
import { parseHasekoHtmlToKojiAndMeisai } from "./dx/htmlKojiParse.js";
import {
  computeCostsSummary,
  deleteCostsRow,
  extractCostsMeta,
  extractCostsMetaFromDoc,
  formatMoney,
  insertCostsRow,
  loadCostsDraft,
  moveCostsRow,
  parsedToCostsRows,
  saveCostsDraft,
  toggleKoshu2Block,
  toggleRowDelFlg,
  updateCostsField
} from "./dx/hasekoCostsModel.js";

const SAMPLE_HTML_URL = "/haseko-samples/toyosu-1415.html";

function parseHtmlDoc(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

export function HasekoEstimateRegister({ onBack }) {
  const [rows, setRows] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [meta, setMeta] = useState({ pageTitle: "見積明細", mitsumori_name: "原状回復工事", mitsumori_bi: "", kanryo_bi: "" });
  const [importMsg, setImportMsg] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [htmlPaste, setHtmlPaste] = useState("");
  const fileRef = useRef(null);
  const loadedRef = useRef(false);

  const summary = useMemo(() => computeCostsSummary(rows), [rows]);

  const applyParsed = useCallback((parsed, docMeta) => {
    const imported = parsedToCostsRows(parsed);
    if (!imported.length) {
      setImportMsg((parsed.warnings || []).slice(0, 2).join(" / ") || "取込できませんでした");
      return false;
    }
    setRows(imported);
    setMeta(extractCostsMeta(parsed, docMeta));
    setImportMsg(`${imported.length} 行取込完了`);
    setSelectedIdx(-1);
    return true;
  }, []);

  const applyHtml = useCallback((html) => {
    const trimmed = String(html || "").trim();
    if (!trimmed) { setImportMsg("HTML が空です"); return; }
    setImportBusy(true);
    try {
      const doc = parseHtmlDoc(trimmed);
      const docMeta = extractCostsMetaFromDoc(doc);
      const parsed = parseHasekoHtmlToKojiAndMeisai(trimmed);
      applyParsed(parsed, docMeta);
    } catch (e) {
      setImportMsg(`取込エラー: ${e?.message || e}`);
    } finally { setImportBusy(false); }
  }, [applyParsed]);

  const loadSample = useCallback(async () => {
    setImportBusy(true);
    setImportMsg("サンプル読込中…");
    try {
      const res = await fetch(SAMPLE_HTML_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      applyHtml(await res.text());
    } catch (e) { setImportMsg(`読込失敗: ${e?.message || e}`); }
    finally { setImportBusy(false); }
  }, [applyHtml]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const draft = loadCostsDraft();
    if (draft?.rows?.length) { setRows(draft.rows); if (draft.meta) setMeta(draft.meta); setImportMsg("下書きから復元"); return; }
    void loadSample();
  }, [loadSample]);

  const sel = selectedIdx >= 0 ? selectedIdx : rows.length - 1;
  const meisaiCount = rows.filter((r) => r.row_kbn === "3").length;
  const activeCount = rows.filter((r) => r.row_kbn === "3" && String(r.del_flg) !== "1").length;

  const handleSaveDraft = () => {
    saveCostsDraft({ rows, meta, savedAt: new Date().toISOString() });
    window.alert("下書きを保存しました");
  };

  const handleRegister = () => window.alert(`見積を登録しました\n総合計 ¥${formatMoney(summary.sogokei)}`);
  const handlePrint = () => window.alert("印刷プレビューは今後実装予定です");
  const handleExportScript = () => {
    const payload = { version: 1, meta, rows, summary: { total: summary.sogokei, subtotal: summary.subtotal } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `haseko_import_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
    setImportMsg("長谷工システム用ファイルを出力しました");
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F8FAFC]">
      {/* Header (48.html style) */}
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
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{meta.mitsumori_name || "見積明細"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider">HASEKO DX</span>
              <span className="text-xs font-medium text-slate-400 num-font">
                {meisaiCount} 明細（有効 {activeCount}）
                {meta.mitsumori_bi ? ` · ${meta.mitsumori_bi}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right flex items-end gap-3">
            <span className="text-sm text-slate-500 font-bold mb-1">税込合計</span>
            <span className="text-3xl font-black text-slate-900 num-font tracking-tight">¥{formatMoney(summary.sogokei)}</span>
          </div>
          <button type="button" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
            onClick={handleSaveDraft}>
            <i className="fa-solid fa-check" /> 保存
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex flex-wrap items-center gap-2 shrink-0">
        <button type="button" className="editor-tool-btn" disabled={importBusy} onClick={() => void loadSample()}>
          <i className="fa-solid fa-clock-rotate-left text-green-600" /> 過去見積反映
        </button>
        <button type="button" className={`editor-tool-btn ${showImport ? "primary" : ""}`} onClick={() => setShowImport((v) => !v)}>
          <i className="fa-solid fa-file-code" /> HTML取込
        </button>
        <button type="button" className="editor-tool-btn" onClick={() => window.alert("テンプレート保存（デモ）")}>
          <i className="fa-solid fa-bookmark text-violet-500" /> テンプレ保存
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <button type="button" className="editor-tool-btn" onClick={() => setShowPreview(true)}>
          <i className="fa-solid fa-eye text-blue-500" /> プレビュー
        </button>
        <button type="button" className="editor-tool-btn" onClick={handlePrint}>
          <i className="fa-solid fa-print text-slate-400" /> 印刷
        </button>
        <button type="button" className="editor-tool-btn" onClick={handleExportScript}>
          <i className="fa-solid fa-file-export text-orange-500" /> 長谷工導入
        </button>
        {importMsg && (
          <span className="ml-auto text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1">
            {importMsg}
          </span>
        )}
      </div>

      {/* HTML Import Panel */}
      {showImport && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 shrink-0">
          <textarea className="w-full min-h-[60px] rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-[11px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            placeholder="長谷工の見積登録ページの HTML を貼り付け" value={htmlPaste} onChange={(e) => setHtmlPaste(e.target.value)} />
          <div className="flex gap-2 mt-1.5">
            <button type="button" className="editor-tool-btn primary" disabled={importBusy || !htmlPaste.trim()} onClick={() => applyHtml(htmlPaste)}>解析して反映</button>
            <button type="button" className="editor-tool-btn" onClick={() => fileRef.current?.click()}>
              <i className="fa-solid fa-file-arrow-up" /> .html ファイル
            </button>
            <input ref={fileRef} type="file" accept=".html,text/html" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader();
              r.onload = () => applyHtml(String(r.result || "")); r.readAsText(f, "UTF-8"); e.target.value = "";
            }} />
          </div>
        </div>
      )}

      {/* Main Content: Grid Table */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="max-w-[1400px] mx-auto">
          <HasekoCostsTable
            rows={rows} selectedIdx={selectedIdx}
            onSelectRow={setSelectedIdx}
            onToggleRow={(idx) => setRows((r) => toggleRowDelFlg(r, idx))}
            onToggleKoshu2={(idx) => setRows((r) => toggleKoshu2Block(r, idx))}
            onField={(idx, field, val) => setRows((r) => updateCostsField(r, idx, field, val))}
            onMoveUp={(idx) => { if (idx > 0) { setRows((r) => moveCostsRow(r, idx, idx - 1)); setSelectedIdx(idx - 1); } }}
            onMoveDown={(idx) => { setRows((r) => { if (idx >= r.length - 1) return r; return moveCostsRow(r, idx, idx + 1); }); setSelectedIdx((i) => (i === idx ? Math.min(idx + 1, rows.length - 1) : i)); }}
            onDelete={(idx) => { setRows((r) => deleteCostsRow(r, idx)); setSelectedIdx(-1); }}
          />
        </div>
      </div>

      {/* Bottom Bar (48.html style) */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] z-20">
        <div className="flex gap-2">
          <button type="button" className="editor-tool-btn" onClick={() => setRows((r) => insertCostsRow(r, sel, "1"))}>
            <i className="fa-solid fa-folder text-blue-500" /> ＋ 大分類
          </button>
          <button type="button" className="editor-tool-btn" onClick={() => setRows((r) => insertCostsRow(r, sel, "2"))}>
            <i className="fa-solid fa-layer-group text-blue-400" /> ＋ 工種
          </button>
          <button type="button" className="editor-tool-btn" onClick={() => setRows((r) => insertCostsRow(r, sel, "3"))}>＋ 標準明細</button>
          <button type="button" className="editor-tool-btn" onClick={() => setRows((r) => insertCostsRow(r, sel, "4"))}>
            <i className="fa-solid fa-comment text-amber-400" /> ＋ コメント
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="editor-tool-btn" onClick={handleSaveDraft}>
            <i className="fa-solid fa-save" /> 下書き保存
          </button>
          <button type="button" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
            onClick={handleRegister}>
            <i className="fa-solid fa-paper-plane" /> 見積登録
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-bold text-slate-900">御見積プレビュー</h3>
              <button type="button" className="editor-tool-btn" onClick={() => setShowPreview(false)}>閉じる</button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <HasekoCostsSummary summary={summary} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
