import React, { useCallback, useMemo, useState } from "react";
import { previewGenbashoImport, genbashoPreviewToSections } from "../genbasho/genbashoToQuote.js";

const SAMPLE_HINT = `例: Excel から原紙見積をコピーして貼り付け
1\tクロス貼替工事\t\t\t\t\tSP2519
\t\tクロス貼替\t\t総㎡\t31.9㎡
\t　【内訳】\t\t\t天井\t壁
\t\t洗面ﾄｲﾚ\t\t\t8.3\t㎡\t8.3\t1,000\t8,300`;

export function GenbashoImportModal({ open, onClose, onApply }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState("paste");

  const stats = preview?.stats;

  const previewRows = useMemo(() => {
    if (!preview) return [];
    return preview.sections.flatMap((s) =>
      (s.matched.rows || []).map((r) => ({
        basho: r.basho,
        bui: r.bui,
        suryo: r.suryo,
        tanka: r.tanka,
        matched: r.matched,
        score: r.match_score
      }))
    );
  }, [preview]);

  const handleParse = useCallback(() => {
    if (!text.trim()) return;
    const result = previewGenbashoImport(text);
    setPreview(result);
    setStep("preview");
  }, [text]);

  const handleApply = useCallback(() => {
    if (!preview?.sections?.length) return;
    onApply(genbashoPreviewToSections(preview));
    setText("");
    setPreview(null);
    setStep("paste");
    onClose();
  }, [preview, onApply, onClose]);

  const handleClose = useCallback(() => {
    setStep("paste");
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="genbasho-modal-overlay" onClick={handleClose}>
      <div className="genbasho-modal" onClick={(e) => e.stopPropagation()}>
        <div className="genbasho-modal-header">
          <div>
            <h2 className="genbasho-modal-title">原紙見積取込</h2>
            <p className="genbasho-modal-sub">クロス貼替 → DB 突合 → 明細反映</p>
          </div>
          <button type="button" className="genbasho-modal-close" onClick={handleClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {step === "paste" ? (
          <>
            <textarea
              className="genbasho-textarea"
              placeholder={SAMPLE_HINT}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
            <div className="genbasho-modal-actions">
              <button type="button" className="genbasho-btn secondary" onClick={handleClose}>
                キャンセル
              </button>
              <button type="button" className="genbasho-btn primary" disabled={!text.trim()} onClick={handleParse}>
                <i className="fa-solid fa-magnifying-glass" /> 解析プレビュー
              </button>
            </div>
          </>
        ) : (
          <>
            {stats && (
              <div className="genbasho-stats">
                <span>{stats.sections} 工事</span>
                <span>{stats.meisai_rows} 明細</span>
                <span className="text-emerald-600">{stats.matched_rows} DB一致</span>
                {stats.review_rows > 0 && <span className="text-amber-600">{stats.review_rows} 要確認</span>}
              </div>
            )}

            {preview?.warnings?.length > 0 && (
              <div className="genbasho-warn">
                {preview.warnings.map((w, i) => (
                  <div key={i}>⚠ {String(w.detail || w.type)}</div>
                ))}
              </div>
            )}

            <div className="genbasho-preview-list">
              {previewRows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">解析結果がありません</p>
              ) : (
                previewRows.map((r, i) => (
                  <div key={i} className={`genbasho-preview-row ${r.matched ? "matched" : "review"}`}>
                    <div className="font-bold text-sm truncate">{r.basho || "—"}</div>
                    <div className="text-xs text-slate-500">
                      {r.bui} · {r.suryo}㎡ · ¥{Number(r.tanka || 0).toLocaleString("ja-JP")}
                    </div>
                    <span className={`genbasho-match-badge ${r.matched ? "ok" : "warn"}`}>
                      {r.matched ? `DB ${Math.round((r.score || 0) * 100)}%` : "要確認"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="genbasho-modal-actions">
              <button type="button" className="genbasho-btn secondary" onClick={() => setStep("paste")}>
                戻る
              </button>
              <button
                type="button"
                className="genbasho-btn primary"
                disabled={!preview?.sections?.length}
                onClick={handleApply}
              >
                <i className="fa-solid fa-file-import" /> 明細に反映
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
