import React, { useCallback, useMemo, useState } from "react";
import {
  buildSiteMeetBundle,
  downloadTextFile,
  loadInspectionDraft,
  rpaRowsToCsv,
  buildRpaRowsFromDraft
} from "./siteMeetExport.js";

function sanitizeFileName(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .slice(0, 120);
}

export function SiteMeetLandingBar({ enabled, project, catalogRows = [], masters = [] }) {
  const [msg, setMsg] = useState("");

  const baseName = useMemo(() => {
    const p = `${project?.estateName ?? ""}_${project?.roomNo ?? ""}`.trim() || "立会";
    return sanitizeFileName(p);
  }, [project?.estateName, project?.roomNo]);

  const pickN = useCallback(() => {
    const d = loadInspectionDraft();
    return d?.selected ? Object.keys(d.selected).length : 0;
  }, []);

  const onJson = useCallback(() => {
    try {
      const bundle = buildSiteMeetBundle({ project, catalogRows, masters });
      downloadTextFile(
        `${baseName}_立会_${Date.now()}.json`,
        JSON.stringify(bundle, null, 2),
        "application/json;charset=utf-8"
      );
      setMsg(`JSON ${bundle.rpa_rows?.length ?? 0} 行`);
    } catch (e) {
      setMsg(String(e.message || e));
    }
  }, [baseName, project, catalogRows, masters]);

  const onCsv = useCallback(() => {
    try {
      const draft = loadInspectionDraft();
      downloadTextFile(
        `${baseName}_RPA_${Date.now()}.csv`,
        rpaRowsToCsv(buildRpaRowsFromDraft(draft, masters)),
        "text/csv;charset=utf-8"
      );
      setMsg("CSV 完了");
    } catch (e) {
      setMsg(String(e.message || e));
    }
  }, [baseName, masters]);

  if (!enabled) return null;

  const n = pickN();

  return (
    <div className="site-meet-landing-bar no-print sticky bottom-0 z-[70] border-t border-slate-200 bg-[var(--haseko-surface)]/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:px-4">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-[11px] text-slate-600">
          立会 · 先に「保存」 · 選択 <span className="font-mono font-semibold text-[var(--haseko-green)]">{n}</span> 行
          {msg ? <span className="ml-2 text-slate-800">{msg}</span> : null}
        </div>
        <div className="flex gap-2">
          <button type="button" className="site-meet-touch haseko-btn-primary min-h-11 px-3 text-[12px]" onClick={onJson}>
            JSON
          </button>
          <button type="button" className="site-meet-touch haseko-btn-outline min-h-11 px-3 text-[12px]" onClick={onCsv}>
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
