import React from "react";

export function QuoteInputPad({ dbMasterData, projectLabel, budget }) {
  const n = dbMasterData?.masters?.length ?? 0;
  return (
    <div className="rounded-lg border bg-white p-4 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">{projectLabel}</p>
      <p className="mt-1 font-mono text-xs">
        ¥{Number(budget ?? 0).toLocaleString("ja-JP")} · {n} マスタ
      </p>
      <p className="mt-3 text-xs text-slate-500">プレースホルダ。本操作は DX 巡検へ。</p>
    </div>
  );
}
