import React, { useCallback, useMemo, useState } from "react";
import { HASEKO_KOSHU2_SEED, formatKoshuLine, coalesceKoshuPairWithSeed } from "./hasekoKoshu2Seed.js";
import {
  loadHiddenKoshuIds,
  saveHiddenKoshuIds,
  loadKoshuOverrides,
  saveKoshuOverrides,
  loadKoshuCustom,
  saveKoshuCustom
} from "./koshu2CatalogMerge.js";

function nextCustomId() {
  return `c${Date.now()}`;
}

export function KoshuCatalogPanel({ onBack, onSaved }) {
  const [hidden, setHidden] = useState(() => loadHiddenKoshuIds());
  const [overrides, setOverrides] = useState(() => loadKoshuOverrides());
  const [custom, setCustom] = useState(() => loadKoshuCustom());
  const [newLabel, setNewLabel] = useState("");
  const [newSub, setNewSub] = useState("");

  const seedRows = useMemo(
    () =>
      HASEKO_KOSHU2_SEED.map((s) => {
        const o = overrides[String(s.id)] || {};
        const { label, koshu2_text } = coalesceKoshuPairWithSeed(o, s);
        return {
          ...s,
          label,
          koshu2_text,
          name: formatKoshuLine({ label, koshu2_text }),
          hidden: hidden.has(String(s.id))
        };
      }),
    [overrides, hidden]
  );

  const persistAll = useCallback(() => {
    saveHiddenKoshuIds(hidden);
    saveKoshuOverrides(overrides);
    saveKoshuCustom(custom);
    onSaved?.();
  }, [hidden, overrides, custom, onSaved]);

  const toggleHidden = (id) => {
    const sid = String(id);
    setHidden((prev) => {
      const n = new Set(prev);
      if (n.has(sid)) n.delete(sid);
      else n.add(sid);
      return n;
    });
  };

  const patchOverride = (id, field, value) => {
    const sid = String(id);
    setOverrides((prev) => {
      const next = { ...prev };
      if (!next[sid]) next[sid] = {};
      next[sid] = { ...next[sid], [field]: value };
      return next;
    });
  };

  const addCustom = () => {
    const label = newLabel.trim();
    if (!label) return;
    const koshu2_text = newSub.trim() || label.replace(/工事.*$/, "").trim() || "カスタム";
    setCustom((prev) => [...prev, { id: nextCustomId(), label, koshu2_text, discontinued: false }]);
    setNewLabel("");
    setNewSub("");
  };

  const removeCustom = (id) => {
    setCustom((prev) => prev.filter((x) => String(x.id) !== String(id)));
  };

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">工事区分（sel_koshu2_cd 相当）</h1>
          <p className="mt-1 text-xs text-slate-600">
            既定は長谷工系プルダウン相当。「一覧から外す」は非表示（削除扱い）。文言は編集で上書き保存できます。カスタム行は削除で消えます。
          </p>
        </div>
        <button type="button" className="haseko-btn-outline text-sm" onClick={onBack}>
          戻る
        </button>
      </header>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-semibold text-slate-700">既定工種</div>
        {seedRows.map((row) => (
          <div
            key={row.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-2 text-sm ${
              row.discontinued ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/80"
            }`}
          >
            <span className="w-8 shrink-0 font-mono text-xs text-slate-500">{row.id}</span>
            <input
              className="min-w-[140px] flex-1 rounded border px-2 py-1 text-xs"
              value={row.label}
              onChange={(e) => patchOverride(row.id, "label", e.target.value)}
              aria-label={`工種名 ${row.id}`}
            />
            <span className="text-slate-400">/</span>
            <input
              className="w-24 rounded border px-2 py-1 text-xs"
              value={row.koshu2_text}
              onChange={(e) => patchOverride(row.id, "koshu2_text", e.target.value)}
              aria-label={`略称 ${row.id}`}
            />
            {row.discontinued ? (
              <span className="rounded bg-amber-200 px-1.5 text-[10px] font-bold text-amber-900">廃止</span>
            ) : null}
            <label className="ml-auto flex cursor-pointer items-center gap-1 text-[11px] text-slate-600">
              <input type="checkbox" checked={row.hidden} onChange={() => toggleHidden(row.id)} />
              一覧から外す
            </label>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <div className="text-xs font-semibold text-slate-700">カスタム工種（追加）</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="min-w-[180px] flex-1 rounded border px-2 py-1.5 text-sm"
            placeholder="例：バルコニー防水工事"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <input
            className="w-32 rounded border px-2 py-1.5 text-sm"
            placeholder="略称（任意）"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
          />
          <button type="button" className="haseko-btn-primary px-3 py-1.5 text-sm" onClick={addCustom}>
            追加
          </button>
        </div>
        {custom.length ? (
          <ul className="mt-3 space-y-2">
            {custom.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded border border-[var(--haseko-green)]/30 bg-[var(--haseko-green-soft)] px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-mono text-xs text-slate-500">{c.id}</span>{" "}
                  <strong>{formatKoshuLine(c)}</strong>
                </span>
                <button type="button" className="text-xs font-semibold text-red-700 hover:underline" onClick={() => removeCustom(c.id)}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">まだありません。</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="haseko-btn-primary px-4 py-2 text-sm" onClick={persistAll}>
          保存して反映
        </button>
      </div>
    </div>
  );
}
