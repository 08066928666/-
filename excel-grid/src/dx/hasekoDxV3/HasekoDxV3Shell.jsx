import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_KEY,
  buildMaxTemplateFromHasekoStandard,
  calculateLineAmount,
  computeTotals,
  deepCloneItems,
  loadDatabase,
  newId,
  normalizeItems,
  saveDatabase,
  toggleCategoryActive,
  toggleRowActive
} from "./hasekoDxV3Workflow.js";

const IOS_BG = "#F2F2F7";
const IOS_PURPLE = "#AF52DE";
const IOS_BLUE = "#007AFF";

function GlassHeader({ children, className = "" }) {
  return (
    <div
      className={`sticky top-0 z-50 border-b border-black/10 px-4 pb-4 pt-10 ${className}`}
      style={{
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)"
      }}
    >
      {children}
    </div>
  );
}

function IosCard({ children, className = "" }) {
  return (
    <div
      className={`mx-4 overflow-hidden shadow-sm ${className}`}
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}
    >
      {children}
    </div>
  );
}

function fmtYen(n) {
  return `¥${Math.round(Number(n) || 0).toLocaleString("ja-JP")}`;
}

export function HasekoDxV3Shell({ onBack }) {
  const [db, setDb] = useState(() => loadDatabase());
  const [page, setPage] = useState("list");
  const [search, setSearch] = useState("");
  const [expandedPid, setExpandedPid] = useState(() => new Set(db.properties.map((p) => p.id)));
  const [builderItems, setBuilderItems] = useState(() => normalizeItems([]));
  const [roomCtx, setRoomCtx] = useState(null);
  const [editorItems, setEditorItems] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [tplModal, setTplModal] = useState(false);
  const editorItemsRef = useRef(editorItems);

  useEffect(() => {
    editorItemsRef.current = editorItems;
  }, [editorItems]);

  const persist = useCallback((next) => {
    setDb(next);
    saveDatabase(next);
  }, []);

  const filteredProps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db.properties;
    return db.properties.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      return p.rooms.some((r) => `${p.name} ${r.name}`.toLowerCase().includes(q));
    });
  }, [db.properties, search]);

  const pushEditorHistory = useCallback(() => {
    setUndoStack((s) => [...s, JSON.stringify(editorItemsRef.current)]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((s) => {
      if (!s.length) return s;
      const snap = s[s.length - 1];
      setRedoStack((r) => [...r, JSON.stringify(editorItemsRef.current)]);
      setEditorItems(JSON.parse(snap));
      return s.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const snap = r[r.length - 1];
      setUndoStack((s) => [...s, JSON.stringify(editorItemsRef.current)]);
      setEditorItems(JSON.parse(snap));
      return r.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    if (page !== "editor") return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, undo, redo]);

  const openBuilder = () => {
    setBuilderItems(normalizeItems(db.templates[0]?.items || []));
    setPage("builder");
  };

  const importPastToBuilder = () => {
    setBuilderItems(buildMaxTemplateFromHasekoStandard());
  };

  const saveTemplateToLibrary = () => {
    const name = window.prompt("テンプレート名を入力", "新築用 MAX テンプレート");
    if (!name?.trim()) return;
    const tpl = { id: newId("tpl"), name: name.trim(), items: normalizeItems(builderItems.map((i) => ({ ...i, active: true }))) };
    persist({ ...db, templates: [...db.templates, tpl] });
    setPage("list");
  };

  const openRoom = (pId, rId) => {
    const p = db.properties.find((x) => x.id === pId);
    const r = p?.rooms.find((x) => x.id === rId);
    if (!p || !r) return;
    setRoomCtx({ pId, rId, building: p.name, room: r.name });
    setEditorItems(deepCloneItems(r.items));
    setUndoStack([]);
    setRedoStack([]);
    setPage("editor");
  };

  const saveRoomAndLeave = () => {
    if (!roomCtx) return;
    const { grand } = computeTotals(editorItems);
    const next = {
      ...db,
      properties: db.properties.map((p) =>
        p.id !== roomCtx.pId
          ? p
          : {
              ...p,
              rooms: p.rooms.map((rr) =>
                rr.id !== roomCtx.rId ? rr : { ...rr, items: deepCloneItems(editorItems), total: grand }
              )
            }
      )
    };
    persist(next);
    setPage("list");
  };

  const applyTemplate = (tplId) => {
    const t = db.templates.find((x) => x.id === tplId);
    if (!t) return;
    pushEditorHistory();
    setEditorItems(deepCloneItems(t.items));
    setTplModal(false);
  };

  const updateEditorItem = (idx, patch) => {
    pushEditorHistory();
    setEditorItems((prev) => {
      const next = deepCloneItems(prev);
      if (!next[idx]) return prev;
      Object.assign(next[idx], patch);
      return next;
    });
  };

  const onToggleCategory = (idx) => {
    pushEditorHistory();
    setEditorItems((prev) => toggleCategoryActive(prev, idx));
  };

  const onToggleRow = (idx) => {
    pushEditorHistory();
    setEditorItems((prev) => toggleRowActive(prev, idx));
  };

  const totals = useMemo(() => computeTotals(editorItems), [editorItems]);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const toggleExpand = (pid) => {
    setExpandedPid((prev) => {
      const n = new Set(prev);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
  };

  if (page === "builder") {
    return (
      <div className="haseko-dx-v3 flex min-h-screen flex-col" style={{ backgroundColor: IOS_BG, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <GlassHeader>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-sm font-bold" style={{ color: IOS_PURPLE }} onClick={() => setPage("list")}>
              ← 戻る
            </button>
            <h2 className="text-center text-base font-bold text-slate-900">テンプレート作成（MAX）</h2>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: "#9333EA" }}
              onClick={saveTemplateToLibrary}
            >
              保存
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">Phase 1 · 紫色テーマ — オフィスで「全損壊想定」MAX リストを構築し、ライブラリへ保存します。</p>
        </GlassHeader>
        <div className="flex gap-2 border-b border-slate-200/80 bg-white px-4 py-3">
          <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800" onClick={importPastToBuilder}>
            過去見積を反映
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800"
            onClick={() =>
              setBuilderItems((prev) => [...prev, normalizeItems([{ type: "L2", name: "新規項目", qty: 1, unit: "式", price: 0 }])[0]])
            }
          >
            行追加
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 text-white" style={{ backgroundColor: "#004098" }}>
              <tr>
                <th className="px-2 py-2.5 text-left font-medium" style={{ width: 48 }}>
                  階層
                </th>
                <th className="px-2 py-2.5 text-left font-medium">工事内容</th>
                <th className="px-2 py-2.5 text-right font-medium" style={{ width: 72 }}>
                  数量
                </th>
                <th className="px-2 py-2.5 text-center font-medium" style={{ width: 56 }}>
                  単位
                </th>
                <th className="px-2 py-2.5 text-right font-medium" style={{ width: 88 }}>
                  単価
                </th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {builderItems.map((item, idx) => (
                <tr key={item.id} className={item.type === "L1" ? "bg-purple-50" : ""} style={{ borderBottom: "1px solid #E5E5EA" }}>
                  <td className="px-1 py-1">
                    <select
                      className="w-full rounded border-0 bg-transparent text-[10px] font-bold"
                      value={item.type}
                      onChange={(e) => {
                        const t = e.target.value;
                        setBuilderItems((prev) => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], type: t };
                          return n;
                        });
                      }}
                    >
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className="w-full rounded border border-transparent px-1 py-1 text-[13px] font-semibold outline-none focus:border-purple-400 focus:bg-white"
                      value={item.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuilderItems((prev) => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], name: v };
                          return n;
                        });
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <input
                      type="number"
                      className="w-full rounded border border-transparent px-1 py-1 text-right font-mono text-[13px] outline-none focus:border-purple-400"
                      value={item.type === "L3" ? item.ceilingM2 + item.wallM2 : item.qty}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setBuilderItems((prev) => {
                          const n = [...prev];
                          if (n[idx].type === "L3") {
                            n[idx] = { ...n[idx], ceilingM2: Math.round(v * 0.35 * 10) / 10, wallM2: Math.round(v * 0.65 * 10) / 10 };
                          } else {
                            n[idx] = { ...n[idx], qty: v };
                          }
                          return n;
                        });
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <input
                      className="w-full rounded border border-transparent px-1 py-1 text-center text-[12px] outline-none focus:border-purple-400"
                      value={item.unit}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuilderItems((prev) => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], unit: v };
                          return n;
                        });
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <input
                      type="number"
                      className="w-full rounded border border-transparent px-1 py-1 text-right font-mono text-[13px] font-bold text-purple-700 outline-none focus:border-purple-400"
                      value={item.price}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setBuilderItems((prev) => {
                          const n = [...prev];
                          n[idx] = { ...n[idx], price: v };
                          return n;
                        });
                      }}
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      className="text-rose-400"
                      aria-label="行削除"
                      onClick={() => setBuilderItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (page === "editor" && roomCtx) {
    return (
      <div className="haseko-dx-v3 flex min-h-screen flex-col" style={{ backgroundColor: IOS_BG, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <GlassHeader>
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="text-sm font-bold" style={{ color: IOS_BLUE }} onClick={() => setPage("list")}>
              ← 一覧
            </button>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">
                {roomCtx.building} {roomCtx.room} 号室
              </div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">On-Site · 減法モード</div>
            </div>
            <button type="button" className="text-sm font-bold" style={{ color: IOS_BLUE }} onClick={saveRoomAndLeave}>
              完了
            </button>
          </div>
        </GlassHeader>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <button
            type="button"
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600"
            onClick={() => setTplModal(true)}
          >
            テンプレート反映
          </button>
          <div className="flex gap-1">
            <button
              type="button"
              className="w-10 rounded-lg border border-slate-200 bg-white py-1.5 text-slate-400 disabled:opacity-40"
              style={{ color: canUndo ? IOS_BLUE : "#CCC" }}
              disabled={!canUndo}
              onClick={undo}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              type="button"
              className="w-10 rounded-lg border border-slate-200 bg-white py-1.5"
              style={{ color: canRedo ? IOS_BLUE : "#CCC" }}
              disabled={!canRedo}
              onClick={redo}
              title="Redo"
            >
              ↷
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto pb-36">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 text-white" style={{ backgroundColor: "#004098" }}>
              <tr>
                <th className="px-1 py-2 text-center font-medium" style={{ width: 36 }}>
                  ✓
                </th>
                <th className="px-2 py-2 text-left font-medium">工事内容・内訳</th>
                <th className="px-1 py-2 text-right font-medium" style={{ width: 120 }}>
                  数量 / 面積
                </th>
                <th className="px-1 py-2 text-center font-medium" style={{ width: 44 }}>
                  単位
                </th>
                <th className="px-1 py-2 text-right font-medium" style={{ width: 72 }}>
                  単価
                </th>
                <th className="px-1 py-2 text-right font-medium" style={{ width: 80 }}>
                  金額
                </th>
              </tr>
            </thead>
            <tbody>
              {editorItems.map((item, idx) => {
                const dim = !item.active;
                const lineAmt = calculateLineAmount(item);
                const rowStyle = dim ? { opacity: 0.35, backgroundColor: "#FAFAFA" } : {};
                if (item.type === "L1") {
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer font-bold"
                      style={{
                        ...rowStyle,
                        backgroundColor: dim ? "#FAFAFA" : "#E8F0FE",
                        borderBottom: "1px solid #E5E5EA"
                      }}
                    >
                      <td className="px-1 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={item.active}
                          className="h-4 w-4 accent-blue-600"
                          onChange={() => onToggleCategory(idx)}
                        />
                      </td>
                      <td colSpan={5} className="px-2 py-2 text-[12px]" onClick={() => onToggleCategory(idx)}>
                        {item.name}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} style={{ ...rowStyle, borderBottom: "1px solid #E5E5EA", transition: "opacity 0.2s" }}>
                    <td className="px-1 py-2 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={item.active}
                        className="h-4 w-4 accent-blue-600"
                        onChange={() => onToggleRow(idx)}
                      />
                    </td>
                    <td className="pl-3 text-[13px] font-semibold text-slate-800">{item.name}</td>
                    <td className="px-1 py-2 text-right align-middle">
                      {item.type === "L3" ? (
                        <div className="flex flex-col items-end gap-0.5 text-[11px]">
                          <label className="flex items-center gap-0.5">
                            <span className="text-slate-400">天</span>
                            <input
                              type="number"
                              className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right font-mono disabled:pointer-events-none disabled:opacity-50"
                              value={item.ceilingM2}
                              disabled={dim}
                              onChange={(e) => updateEditorItem(idx, { ceilingM2: parseFloat(e.target.value) || 0 })}
                            />
                          </label>
                          <label className="flex items-center gap-0.5">
                            <span className="text-slate-400">壁</span>
                            <input
                              type="number"
                              className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right font-mono disabled:pointer-events-none disabled:opacity-50"
                              value={item.wallM2}
                              disabled={dim}
                              onChange={(e) => updateEditorItem(idx, { wallM2: parseFloat(e.target.value) || 0 })}
                            />
                          </label>
                        </div>
                      ) : (
                        <input
                          type="number"
                          className="w-full max-w-[5.5rem] rounded border border-transparent px-1 py-1 text-right font-mono font-bold outline-none focus:border-blue-400 disabled:pointer-events-none disabled:opacity-50"
                          value={item.qty}
                          disabled={dim}
                          onChange={(e) => updateEditorItem(idx, { qty: parseFloat(e.target.value) || 0 })}
                        />
                      )}
                    </td>
                    <td className="px-1 py-2 text-center text-[10px] text-slate-500">{item.unit}</td>
                    <td className="px-1 py-2 text-right font-mono text-[12px] text-blue-600">{Number(item.price).toLocaleString("ja-JP")}</td>
                    <td
                      className={`amount-cell px-1 py-2 text-right text-[13px] font-bold tabular-nums text-slate-900 ${dim ? "line-through" : ""}`}
                    >
                      {lineAmt.toLocaleString("ja-JP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 p-4 text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50">小計 / 税10% / 合計</div>
            <div className="text-xl font-bold tracking-tight">
              {fmtYen(totals.subtotal)}
              <span className="mx-2 text-sm font-normal opacity-70">+ 税 {fmtYen(totals.tax)}</span>
            </div>
            <div className="text-2xl font-extrabold text-blue-400">{fmtYen(totals.grand)}</div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition active:scale-95"
            style={{ backgroundColor: IOS_BLUE }}
            onClick={() => window.alert(`見積確定（プロトタイプ）\n${fmtYen(totals.grand)}`)}
          >
            見積確定
          </button>
        </div>

        {tplModal ? (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="テンプレート選択"
          >
            <div className="w-full max-w-xl rounded-t-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">テンプレート選択</h3>
                <button type="button" className="text-2xl leading-none text-slate-400 hover:text-slate-600" onClick={() => setTplModal(false)}>
                  ×
                </button>
              </div>
              <div className="max-h-[50vh] space-y-3 overflow-y-auto pb-6">
                {db.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left active:bg-blue-50"
                    onClick={() => applyTemplate(t.id)}
                  >
                    <div>
                      <div className="font-bold text-slate-800">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.items.length} 項目</div>
                    </div>
                    <span className="text-blue-500">↓</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="haseko-dx-v3 min-h-screen pb-24" style={{ backgroundColor: IOS_BG, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <GlassHeader>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">退去立会</h1>
            <p className="mt-1 text-[11px] text-slate-500">Haseko DX · Smart Workflow V3.0</p>
          </div>
          {onBack ? (
            <button type="button" className="haseko-btn-outline text-[12px]" onClick={onBack}>
              巡検へ戻る
            </button>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="search"
            placeholder="物件・部屋を検索"
            className="flex-1 rounded-xl border-0 px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-purple-400"
            style={{ backgroundColor: "#E3E3E6" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm"
            style={{ backgroundColor: "#9333EA" }}
            onClick={openBuilder}
          >
            テンプレ管理
          </button>
        </div>
      </GlassHeader>

      <div className="mt-2 space-y-3">
        {filteredProps.map((p) => {
          const open = expandedPid.has(p.id);
          return (
            <IosCard key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-3 text-left font-bold text-blue-600"
                onClick={() => toggleExpand(p.id)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-slate-400 transition-transform" style={{ transform: open ? "rotate(90deg)" : "none", display: "inline-block" }}>
                    ▸
                  </span>
                  {p.name}
                </span>
                <span className="text-xs font-normal text-slate-500">{p.rooms.length} 部屋</span>
              </button>
              {open ? (
                <div>
                  {p.rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3.5 text-left last:border-b-0 active:bg-slate-50"
                      onClick={() => openRoom(p.id, r.id)}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl text-slate-300">▭</span>
                        <span className="font-semibold text-slate-900">{r.name} 号室</span>
                      </span>
                      <span className="text-right">
                        <span className="text-sm font-bold tabular-nums text-slate-800">{fmtYen(r.total)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </IosCard>
          );
        })}
      </div>

      <p className="mx-4 mt-4 text-[10px] leading-relaxed text-slate-400">
        データはブラウザ <code className="rounded bg-slate-200 px-1">{STORAGE_KEY}</code> に保存されます。現場ではチェックを外すと論理削除（取り消し可能）し、小計＋10%税で合計を表示します。
      </p>
    </div>
  );
}
