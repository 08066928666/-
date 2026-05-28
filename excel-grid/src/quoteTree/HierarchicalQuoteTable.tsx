import React, { useCallback, useId, useMemo } from "react";
import type {
  HierarchyDetailRow,
  HierarchyL1Group,
  HierarchyL2Node,
  QuoteTreeDoc
} from "./types";

function cid() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

function clampDoc(raw: unknown): QuoteTreeDoc {
  const o = raw as Partial<QuoteTreeDoc>;
  if (o && o.version === 1 && Array.isArray(o.roots)) return o as QuoteTreeDoc;
  return { version: 1, roots: [] };
}

export type Props = {
  value: QuoteTreeDoc;
  onChange: (next: QuoteTreeDoc) => void;
  descriptionSuggestions: Record<string, string[]>;
  defaultDescriptionByKoshu: Record<string, string>;
  dbStatusText: string;
};

function updateAtPath(
  roots: HierarchyL1Group[],
  gid: string,
  lid: string | null,
  updater: (
    group: HierarchyL1Group,
    branch: HierarchyL2Node | null
  ) => { group: HierarchyL1Group; branch: HierarchyL2Node | null }
): HierarchyL1Group[] {
  return roots.map((g) => {
    if (g.id !== gid) return g;
    if (!lid) {
      const { group } = updater(g, null);
      return group;
    }
    const idx = g.children.findIndex((c) => c.id === lid);
    if (idx < 0) return g;
    const branch = g.children[idx];
    const { group, branch: nextBranch } = updater(g, branch);
    const nextKids = [...group.children];
    if (nextBranch) nextKids[idx] = nextBranch;
    return { ...group, children: nextKids };
  });
}

export function HierarchicalQuoteTable({
  value,
  onChange,
  descriptionSuggestions,
  defaultDescriptionByKoshu,
  dbStatusText
}: Props) {
  const uid = useId();
  const doc = useMemo(() => clampDoc(value), [value]);

  const setDoc = useCallback(
    (next: QuoteTreeDoc) => onChange(next),
    [onChange]
  );

  const patchDetail = useCallback(
    (gid: string, lid: string, rowId: string, patch: Partial<HierarchyDetailRow>) => {
      setDoc({
        ...doc,
        roots: updateAtPath(doc.roots, gid, lid, (group, branch) => {
          if (!branch) return { group, branch: null };
          const details = branch.details.map((r) =>
            r.id === rowId ? { ...r, ...patch } : r
          );
          return { group, branch: { ...branch, details } };
        })
      });
    },
    [doc, setDoc]
  );

  const addDetailRow = useCallback(
    (gid: string, lid: string) => {
      const defDesc = "";
      setDoc({
        ...doc,
        roots: updateAtPath(doc.roots, gid, lid, (group, branch) => {
          if (!branch) return { group, branch: null };
          const row: HierarchyDetailRow = {
            id: cid(),
            description: defDesc,
            qty: 1,
            unit: "式",
            unitPrice: 0
          };
          return { group, branch: { ...branch, details: [...branch.details, row] } };
        })
      });
    },
    [doc, setDoc]
  );

  const addLevel2 = useCallback(
    (gid: string) => {
      const group = doc.roots.find((g) => g.id === gid);
      if (!group) return;
      const n = group.children.length + 1;
      const branch: HierarchyL2Node = {
        id: cid(),
        koshuName: "新規工種",
        seqLabel: `N-${String(n).padStart(3, "0")}`,
        details: [{ id: cid(), description: "", qty: 1, unit: "式", unitPrice: 0 }]
      };
      setDoc({
        ...doc,
        roots: doc.roots.map((g) =>
          g.id === gid ? { ...g, children: [...g.children, branch] } : g
        )
      });
    },
    [doc, setDoc]
  );

  if (!doc.roots.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">階層データが空です</p>
        <p className="mt-1 text-amber-800">
          MOCK_QUOTE_TREE の読込に失敗したか、状態が無効です。App を再読込してください。
        </p>
        <p className="mt-2 font-mono text-xs text-slate-600">{dbStatusText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {doc.roots.map((group) => (
        <section
          key={group.id}
          className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm"
        >
          <header className="border-b border-slate-200 bg-slate-100 px-4 py-2">
            <h2 className="text-base font-bold text-slate-900">{group.label}</h2>
            <button
              type="button"
              className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              onClick={() => addLevel2(group.id)}
            >
              ＋ Level2 を追加
            </button>
          </header>
          <div className="divide-y divide-slate-100 px-4 py-3">
            {group.children.map((br) => {
              const sug = descriptionSuggestions[br.koshuName] ?? [];
              const datalistId = `${uid}-${group.id}-${br.id}`;
              const defDesc = defaultDescriptionByKoshu[br.koshuName] ?? "";

              return (
                <article key={br.id} className="py-4 first:pt-0">
                  <div className="mb-3 flex flex-wrap items-baseline gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {br.seqLabel}
                    </span>
                    <input
                      className="rounded border px-2 py-1 text-sm font-semibold"
                      value={br.koshuName}
                      aria-label={`工種名 ${br.seqLabel}`}
                      onChange={(e) => {
                        const name = e.target.value;
                        setDoc({
                          ...doc,
                          roots: updateAtPath(doc.roots, group.id, br.id, (g0, b) => {
                            if (!b) return { group: g0, branch: null };
                            return { group: g0, branch: { ...b, koshuName: name } };
                          })
                        });
                      }}
                    />
                  </div>
                  <datalist id={datalistId}>
                    {Array.from(new Set([...sug, defDesc].filter(Boolean))).map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-[11px] font-semibold uppercase text-slate-500">
                      <div>概要</div>
                      <div className="w-14 text-right">数量</div>
                      <div className="w-16">単位</div>
                      <div className="w-20 text-right">単価</div>
                      <div className="w-24 text-right">小計</div>
                    </div>
                    {br.details.map((row) => {
                      const line = Number(row.qty || 0) * Number(row.unitPrice || 0);
                      return (
                        <div
                          key={row.id}
                          className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 rounded border border-slate-100 bg-slate-50/80 p-2"
                        >
                          <input
                            className="w-full rounded border px-2 py-1 text-sm"
                            placeholder={defDesc || "概要"}
                            list={datalistId}
                            value={row.description}
                            onChange={(e) =>
                              patchDetail(group.id, br.id, row.id, {
                                description: e.target.value
                              })
                            }
                          />
                          <input
                            type="number"
                            className="w-14 rounded border px-2 py-1 text-right font-mono text-sm"
                            value={Number.isFinite(row.qty) ? row.qty : 0}
                            onChange={(e) =>
                              patchDetail(group.id, br.id, row.id, {
                                qty: Number(e.target.value || 0)
                              })
                            }
                          />
                          <input
                            className="w-16 rounded border px-2 py-1 text-sm"
                            value={row.unit}
                            onChange={(e) =>
                              patchDetail(group.id, br.id, row.id, {
                                unit: e.target.value
                              })
                            }
                          />
                          <input
                            type="number"
                            className="w-20 rounded border px-2 py-1 text-right font-mono text-sm"
                            value={Number.isFinite(row.unitPrice) ? row.unitPrice : 0}
                            onChange={(e) =>
                              patchDetail(group.id, br.id, row.id, {
                                unitPrice: Number(e.target.value || 0)
                              })
                            }
                          />
                          <div className="w-24 text-right font-mono text-sm tabular-nums">
                            ¥{line.toLocaleString("ja-JP")}
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-700 hover:underline"
                      onClick={() => addDetailRow(group.id, br.id)}
                    >
                      ＋ 明細行を追加
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p className="text-xs text-slate-500">{dbStatusText}</p>
    </div>
  );
}
