import React, { useMemo, useState } from "react";

function nextTmpId(existing) {
  let n = 1;
  const ids = new Set((existing || []).map((m) => String(m?.id ?? "")));
  while (ids.has(`tmp-${n}`)) n += 1;
  return `tmp-${n}`;
}

/** カスタム明細マスタを配列で追加（簡略版） */
export function CustomMasterManager({
  categories,
  officialMasters: _officialMasters,
  value,
  defaultKoshu2Id,
  onChange,
  onBack
}) {
  const [koshu, setKoshu] = useState(defaultKoshu2Id ?? categories?.[0]?.id ?? "");
  const catOptions = useMemo(() => categories || [], [categories]);

  const addRow = () => {
    onChange([
      ...(value || []),
      {
        id: nextTmpId(value),
        item_name: "",
        unit: "式",
        unit_price: 0,
        koshu2_id: koshu
      }
    ]);
  };

  const updateAt = (idx, patch) => {
    const next = (value || []).map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange(next);
  };

  const removeAt = (idx) => {
    const next = (value || []).filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">カスタム明細</h1>
          <p className="mt-1 text-xs text-slate-600">巡検一覧に載せたい項目を追加。</p>
        </div>
        <button type="button" className="haseko-btn-outline text-sm" onClick={onBack}>
          DX に戻る
        </button>
      </header>

      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-600">追加時の工事区分</div>
          <select className="mt-1 rounded border px-3 py-2 text-sm" value={koshu} onChange={(e) => setKoshu(e.target.value)}>
            {catOptions.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name ?? c.label ?? c.id}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="self-end rounded bg-[var(--haseko-green)] px-4 py-2 text-sm font-semibold text-white" onClick={addRow}>
          行を追加
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {(value || []).length === 0 ? <p className="text-sm text-slate-500">まだ項目がありません。</p> : null}
        {(value || []).map((m, idx) => (
          <div key={String(m.id ?? idx)} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_repeat(3,minmax(0,1fr))_auto] sm:items-end">
            <div>
              <div className="text-[10px] font-semibold text-slate-500">明細名称</div>
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={m.item_name ?? ""}
                onChange={(e) => updateAt(idx, { item_name: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">単位</div>
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={m.unit ?? ""}
                onChange={(e) => updateAt(idx, { unit: e.target.value })}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">単価</div>
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1 text-right font-mono text-sm"
                value={Number(m.unit_price ?? 0)}
                onChange={(e) => updateAt(idx, { unit_price: Number(e.target.value || 0) })}
              />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-500">区分</div>
              <select
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={String(m.koshu2_id ?? "")}
                onChange={(e) => updateAt(idx, { koshu2_id: e.target.value })}
              >
                {catOptions.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name ?? c.label ?? c.id}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="rounded border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700" onClick={() => removeAt(idx)}>
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
