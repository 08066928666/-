import React, { useCallback, useMemo, useRef, useState } from "react";
import { parseHasekoHtmlToKojiAndMeisai } from "./htmlKojiParse.js";
import { QuoteTabletShell } from "./QuoteTabletShell.jsx";
import { HasekoMitsumoriPreview } from "./HasekoMitsumoriPreview.jsx";
import {
  buildMaxTemplateFromHasekoStandard,
  deepCloneItems,
  loadDatabase,
  newId,
  normalizeItems,
  saveDatabase,
  STORAGE_KEY
} from "./hasekoDxV3/hasekoDxV3Workflow.js";
import {
  dxItemsToQuoteDocument,
  normalizeQuoteDocument,
  parsedHtmlToQuoteDocument,
  quoteDocumentToDxItems
} from "./quoteDocumentModel.js";

function fmtYen(n) {
  return `¥${Math.round(Number(n) || 0).toLocaleString("ja-JP")}`;
}

function ensureRoomQuoteDoc(room, buildingName) {
  if (room.quoteDoc?.packages?.length) return normalizeQuoteDocument(room.quoteDoc);
  if (room.items?.length) return dxItemsToQuoteDocument(room.items, { estateName: buildingName, roomNo: `${room.name}号室` });
  return normalizeQuoteDocument({ meta: { estateName: buildingName, roomNo: `${room.name}号室` }, packages: [] });
}

function ensureTemplateQuoteDoc(tpl) {
  if (tpl.quoteDoc?.packages?.length) return normalizeQuoteDocument(tpl.quoteDoc);
  if (tpl.items?.length) return dxItemsToQuoteDocument(tpl.items);
  return normalizeQuoteDocument({ packages: [] });
}

function StatCard({ icon, iconBg, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: iconBg }}>
        <i className={`${icon} text-white`} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}

function QuickAction({ icon, iconBg, label, onClick }) {
  return (
    <button type="button" className="quick-action" onClick={onClick}>
      <div className="quick-action-icon" style={{ background: iconBg }}>
        <i className={`${icon} text-white`} />
      </div>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </button>
  );
}

function TemplateBuilder({ doc, onDocChange, onBack, onSave }) {
  const [htmlPaste, setHtmlPaste] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const items = useMemo(() => quoteDocumentToDxItems(doc), [doc]);

  const setFromItems = (nextItems) => onDocChange(dxItemsToQuoteDocument(nextItems));

  const importPast = () => {
    setFromItems(buildMaxTemplateFromHasekoStandard());
    setMsg("長谷工標準テンプレを読み込みました");
  };

  const applyHtml = (html) => {
    try {
      const parsed = parseHasekoHtmlToKojiAndMeisai(html);
      const imported = parsedHtmlToQuoteDocument(parsed);
      if (!imported.packages.length) { setMsg("取込できませんでした"); return; }
      onDocChange(imported);
      setMsg(`過去履歴取込：${imported.packages.length} 工事`);
    } catch (e) { setMsg(String(e?.message || e)); }
  };

  return (
    <div className="fullscreen-overlay flex flex-col">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between max-w-[1400px] mx-auto">
          <button type="button" className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800" onClick={onBack}>
            <i className="fa-solid fa-arrow-left" /> 戻る
          </button>
          <h2 className="text-base font-bold text-slate-900">テンプレート編集</h2>
          <button type="button" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700" onClick={onSave}>
            <i className="fa-solid fa-floppy-disk mr-1" /> 保存
          </button>
        </div>
      </div>

      <div className="border-b bg-white px-4 py-3">
        <div className="max-w-[1400px] mx-auto space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200" onClick={importPast}>
              <i className="fa-solid fa-clock-rotate-left mr-1" /> 過去見積を反映
            </button>
            <button type="button" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100" onClick={() => fileRef.current?.click()}>
              <i className="fa-solid fa-file-code mr-1" /> HTML取込
            </button>
            <button type="button" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              onClick={() => setFromItems([...items, normalizeItems([{ type: "L2", name: "新規項目", qty: 1, unit: "式", price: 0 }])[0]])}>
              <i className="fa-solid fa-plus mr-1" /> 行追加
            </button>
          </div>
          <textarea
            className="min-h-[3rem] w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[10px] focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="見積登録 HTML を貼付（過去履歴取り込み）"
            value={htmlPaste}
            onChange={(e) => setHtmlPaste(e.target.value)}
          />
          <button type="button" disabled={!htmlPaste.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40 hover:bg-emerald-700" onClick={() => applyHtml(htmlPaste)}>
            貼付を反映
          </button>
          {msg ? <p className="text-[11px] font-medium text-emerald-700">{msg}</p> : null}
          <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => applyHtml(String(r.result || ""));
            r.readAsText(f, "UTF-8"); e.target.value = "";
          }} />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-[1400px] mx-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold" style={{ width: 56 }}>階層</th>
                <th className="px-3 py-2.5 text-left font-semibold">工事内容</th>
                <th className="px-3 py-2.5 text-right font-semibold" style={{ width: 80 }}>数量</th>
                <th className="px-3 py-2.5 text-center font-semibold" style={{ width: 64 }}>単位</th>
                <th className="px-3 py-2.5 text-right font-semibold" style={{ width: 96 }}>単価</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-slate-100 ${item.type === "L1" ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}>
                  <td className="px-2 py-1.5">
                    <select className="w-full rounded-md bg-transparent text-[11px] font-bold focus:ring-1 focus:ring-emerald-300" value={item.type}
                      onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], type: e.target.value }; setFromItems(n); }}>
                      <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input className="w-full rounded-md border-0 px-2 py-1.5 text-sm font-semibold focus:bg-white focus:ring-1 focus:ring-emerald-300" value={item.name}
                      onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], name: e.target.value }; setFromItems(n); }} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" className="w-full rounded-md border-0 px-2 py-1.5 text-right font-mono focus:ring-1 focus:ring-emerald-300"
                      value={item.type === "L3" ? item.ceilingM2 + item.wallM2 : item.qty}
                      onChange={(e) => { const v = parseFloat(e.target.value) || 0; const n = [...items];
                        if (n[idx].type === "L3") n[idx] = { ...n[idx], ceilingM2: Math.round(v * 0.35 * 10) / 10, wallM2: Math.round(v * 0.65 * 10) / 10 };
                        else n[idx] = { ...n[idx], qty: v }; setFromItems(n); }} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input className="w-full rounded-md border-0 px-2 py-1.5 text-center text-[12px] focus:ring-1 focus:ring-emerald-300" value={item.unit}
                      onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], unit: e.target.value }; setFromItems(n); }} />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" className="w-full rounded-md border-0 px-2 py-1.5 text-right font-mono font-bold text-emerald-700 focus:ring-1 focus:ring-emerald-300" value={item.price}
                      onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], price: parseFloat(e.target.value) || 0 }; setFromItems(n); }} />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button type="button" className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" onClick={() => setFromItems(items.filter((_, i) => i !== idx))}>
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t bg-white p-4">
        <div className="max-w-[1400px] mx-auto">
          <HasekoMitsumoriPreview doc={doc} meta={doc.meta} />
        </div>
      </div>
    </div>
  );
}

export function HasekoAppShell({ onNavigate, dbStatusText }) {
  const [db, setDb] = useState(() => loadDatabase());
  const [screen, setScreen] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [expandedPid, setExpandedPid] = useState(() => new Set(db.properties.map((p) => p.id)));
  const [roomCtx, setRoomCtx] = useState(null);
  const [roomDoc, setRoomDoc] = useState(null);
  const [builderDoc, setBuilderDoc] = useState(() => normalizeQuoteDocument({ packages: [] }));
  const [editingTplId, setEditingTplId] = useState(null);

  const persist = useCallback((next) => { setDb(next); saveDatabase(next); }, []);

  const filteredProps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return db.properties;
    return db.properties.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      return p.rooms.some((r) => `${p.name} ${r.name}`.toLowerCase().includes(q));
    });
  }, [db.properties, search]);

  const totalProperties = db.properties.length;
  const totalRooms = db.properties.reduce((s, p) => s + p.rooms.length, 0);
  const totalAmount = db.properties.reduce((s, p) => s + p.rooms.reduce((rs, r) => rs + Math.round(r.total || 0), 0), 0);
  const todayInspections = db.properties.reduce((s, p) => s + p.rooms.filter((r) => (r.total || 0) > 0).length, 0);

  const addProperty = () => {
    const name = window.prompt("物件名を入力", "新規物件");
    if (!name?.trim()) return;
    const np = { id: newId("p"), name: name.trim(), rooms: [{ id: newId("r"), name: "101", items: [], quoteDoc: null, total: 0 }] };
    persist({ ...db, properties: [...db.properties, np] });
    setExpandedPid((prev) => new Set([...prev, np.id]));
  };

  const deleteProperty = (pId) => {
    if (!window.confirm("この物件を削除しますか？")) return;
    persist({ ...db, properties: db.properties.filter((p) => p.id !== pId) });
  };

  const addRoom = (pId) => {
    const name = window.prompt("部屋番号（号室除く）", "");
    if (!name?.trim()) return;
    persist({
      ...db,
      properties: db.properties.map((p) =>
        p.id !== pId ? p : { ...p, rooms: [...p.rooms, { id: newId("r"), name: name.trim(), items: [], quoteDoc: null, total: 0 }] }
      )
    });
  };

  const deleteRoom = (pId, rId) => {
    if (!window.confirm("この部屋を削除しますか？")) return;
    persist({
      ...db,
      properties: db.properties.map((p) =>
        p.id !== pId ? p : { ...p, rooms: p.rooms.filter((r) => r.id !== rId) }
      )
    });
  };

  const openRoom = (pId, rId) => {
    const p = db.properties.find((x) => x.id === pId);
    const r = p?.rooms.find((x) => x.id === rId);
    if (!p || !r) return;
    setRoomCtx({ pId, rId, building: p.name, room: r.name });
    setRoomDoc(ensureRoomQuoteDoc(r, p.name));
    setScreen("tablet");
  };

  const saveRoom = (doc) => {
    if (!roomCtx) return;
    const items = quoteDocumentToDxItems(doc);
    const subtotal = doc.packages.reduce((s, pkg) => {
      if (!pkg.active) return s;
      return s + pkg.lines.reduce((ls, ln) => (ln.active ? ls + Math.round(ln.quantity * ln.unit_price) : ls), 0);
    }, 0);
    const grand = subtotal + Math.floor(subtotal * 0.1);
    persist({
      ...db,
      properties: db.properties.map((p) =>
        p.id !== roomCtx.pId ? p : {
          ...p,
          rooms: p.rooms.map((rr) =>
            rr.id !== roomCtx.rId ? rr : { ...rr, items: deepCloneItems(items), quoteDoc: doc, total: grand }
          )
        }
      )
    });
    setScreen("dashboard");
    setRoomCtx(null);
  };

  const saveAsTemplate = (name, doc, overwriteId = null) => {
    const items = quoteDocumentToDxItems(doc);
    const tpl = { id: overwriteId || newId("tpl"), name, items: deepCloneItems(items), quoteDoc: normalizeQuoteDocument(doc) };
    if (overwriteId) persist({ ...db, templates: db.templates.map((t) => (t.id === overwriteId ? tpl : t)) });
    else persist({ ...db, templates: [...db.templates, tpl] });
  };

  const openNewTemplate = () => {
    setEditingTplId(null);
    setBuilderDoc(normalizeQuoteDocument({ packages: [] }));
    setScreen("builder");
  };

  const openEditTemplate = (tplId) => {
    const t = db.templates.find((x) => x.id === tplId);
    if (!t) return;
    setEditingTplId(tplId);
    setBuilderDoc(ensureTemplateQuoteDoc(t));
    setScreen("builder");
  };

  const deleteTemplate = (tplId) => {
    if (!window.confirm("このテンプレートを削除しますか？")) return;
    persist({ ...db, templates: db.templates.filter((t) => t.id !== tplId) });
  };

  const saveBuilder = () => {
    const name = window.prompt("テンプレート名", editingTplId ? db.templates.find((t) => t.id === editingTplId)?.name : "新規テンプレート");
    if (!name?.trim()) return;
    const overwrite = editingTplId ? window.confirm("既存テンプレートを上書きしますか？\nキャンセル＝別名で新規保存") : false;
    saveAsTemplate(name.trim(), builderDoc, overwrite ? editingTplId : null);
    setScreen("dashboard");
  };

  if (screen === "tablet" && roomCtx && roomDoc) {
    return (
      <div className="fullscreen-overlay">
        <QuoteTabletShell
          doc={roomDoc}
          meta={{ estateName: roomCtx.building, roomNo: `${roomCtx.room}号室`, workTitle: roomDoc.meta?.workTitle || "原状回復工事" }}
          templates={db.templates}
          onDocChange={setRoomDoc}
          onSaveRoom={saveRoom}
          onSaveAsTemplate={(name, doc) => {
            const ow = window.confirm("同名テンプレートがあれば上書き？\nキャンセル＝新規保存");
            const existing = db.templates.find((t) => t.name === name);
            saveAsTemplate(name, doc, ow && existing ? existing.id : null);
          }}
          onBack={() => { setScreen("dashboard"); setRoomCtx(null); }}
        />
      </div>
    );
  }

  if (screen === "builder") {
    return <TemplateBuilder doc={builderDoc} onDocChange={setBuilderDoc} onBack={() => setScreen("dashboard")} onSave={saveBuilder} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="fa-solid fa-building" iconBg="linear-gradient(135deg, #217346, #16a34a)" value={totalProperties} label="物件数" />
        <StatCard icon="fa-solid fa-door-open" iconBg="linear-gradient(135deg, #2563eb, #3b82f6)" value={totalRooms} label="部屋数" />
        <StatCard icon="fa-solid fa-clipboard-check" iconBg="linear-gradient(135deg, #9333ea, #a855f7)" value={todayInspections} label="見積済み" />
        <StatCard icon="fa-solid fa-yen-sign" iconBg="linear-gradient(135deg, #ea580c, #f97316)" value={fmtYen(totalAmount)} label="見積総額" />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction icon="fa-solid fa-plus" iconBg="linear-gradient(135deg, #217346, #16a34a)" label="物件追加" onClick={addProperty} />
          <QuickAction icon="fa-solid fa-file-invoice" iconBg="linear-gradient(135deg, #0369a1, #0ea5e9)" label="見積登録" onClick={() => onNavigate("haseko-register")} />
          <QuickAction icon="fa-solid fa-file-circle-plus" iconBg="linear-gradient(135deg, #ca8a04, #eab308)" label="テンプレ作成" onClick={openNewTemplate} />
          <QuickAction icon="fa-solid fa-wrench" iconBg="linear-gradient(135deg, #64748b, #94a3b8)" label="工事区分" onClick={() => onNavigate("koshu-catalog")} />
        </div>
      </div>

      {/* Properties Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-slate-700">
            <i className="fa-solid fa-building mr-1.5 text-emerald-600" />
            物件一覧
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="search"
                placeholder="物件・部屋を検索"
                className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 w-[200px] sm:w-[260px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700" onClick={addProperty}>
              <i className="fa-solid fa-plus mr-1" /> 物件追加
            </button>
          </div>
        </div>

        {filteredProps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-building" /></div>
            <p className="text-sm font-medium">物件がありません</p>
            <p className="text-xs mt-1">「物件追加」ボタンで新しい物件を登録しましょう</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProps.map((p) => {
              const open = expandedPid.has(p.id);
              const propTotal = p.rooms.reduce((s, r) => s + Math.round(r.total || 0), 0);
              return (
                <div key={p.id} className="property-card">
                  <div
                    className="property-card-header"
                    onClick={() => setExpandedPid((prev) => {
                      const n = new Set(prev);
                      if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
                      return n;
                    })}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 flex-shrink-0">
                        <i className="fa-solid fa-building text-sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.rooms.length} 部屋 · {fmtYen(propTotal)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                        onClick={(e) => { e.stopPropagation(); addRoom(p.id); }}>
                        <i className="fa-solid fa-plus mr-1" />部屋
                      </button>
                      <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        onClick={(e) => { e.stopPropagation(); deleteProperty(p.id); }} aria-label="物件削除">
                        <i className="fa-solid fa-trash-can text-xs" />
                      </button>
                      <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  {open && (
                    <div>
                      {p.rooms.length === 0 ? (
                        <div className="px-5 py-6 text-center text-xs text-slate-400">
                          部屋がありません — 上の「＋部屋」で追加
                        </div>
                      ) : (
                        p.rooms.map((r) => {
                          const hasQuote = (r.total || 0) > 0;
                          return (
                            <div key={r.id} className="room-row" onClick={() => openRoom(p.id, r.id)}>
                              <div className="room-badge mr-3" style={{
                                background: hasQuote ? "linear-gradient(135deg, #217346, #16a34a)" : "#f1f5f9",
                                color: hasQuote ? "white" : "#64748b"
                              }}>
                                {r.name}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-900 text-sm">{r.name} 号室</div>
                                <div className="text-[11px] text-slate-500">
                                  {hasQuote ? (
                                    <span className="text-emerald-600 font-medium">見積済み</span>
                                  ) : (
                                    <span>未入力</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-sm font-bold tabular-nums ${hasQuote ? "text-slate-900" : "text-slate-300"}`}>
                                  {fmtYen(r.total || 0)}
                                </span>
                                <button type="button" className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                  onClick={(e) => { e.stopPropagation(); deleteRoom(p.id, r.id); }} aria-label="部屋削除">
                                  <i className="fa-solid fa-xmark text-xs" />
                                </button>
                                <i className="fa-solid fa-chevron-right text-[10px] text-slate-300" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700">
            <i className="fa-solid fa-folder-open mr-1.5 text-violet-500" />
            テンプレートライブラリ
          </h2>
          <button type="button" className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700" onClick={openNewTemplate}>
            <i className="fa-solid fa-plus mr-1" /> 新規作成
          </button>
        </div>
        {db.templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="fa-solid fa-folder-open" /></div>
            <p className="text-sm font-medium">テンプレートがありません</p>
            <p className="text-xs mt-1">「新規作成」から見積テンプレートを作成できます</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {db.templates.map((t) => {
              const tDoc = ensureTemplateQuoteDoc(t);
              const pkgCount = tDoc.packages.length;
              const lineCount = quoteDocumentToDxItems(tDoc).length;
              return (
                <div key={t.id} className="template-card" onClick={() => openEditTemplate(t.id)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 shrink-0">
                    <i className="fa-solid fa-file-lines text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{pkgCount} 工事 · {lineCount} 行</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" className="rounded-lg p-1.5 text-violet-500 hover:bg-violet-50" onClick={(e) => { e.stopPropagation(); openEditTemplate(t.id); }}>
                      <i className="fa-solid fa-pen text-xs" />
                    </button>
                    <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                      <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="text-[10px] text-slate-400 pb-4">
        <span className="font-mono bg-slate-100 rounded px-1.5 py-0.5">{dbStatusText || STORAGE_KEY}</span>
      </div>
    </div>
  );
}
