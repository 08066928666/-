import React, { useEffect, useRef, useState } from "react";

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtYen(n) {
  const v = Math.round(Number(n) || 0);
  return v > 0 ? `¥${v.toLocaleString("ja-JP")}` : "¥0";
}

const STATUS_MAP = {
  pending: { label: "未着手", color: "bg-slate-100 text-slate-500" },
  draft: { label: "作成中", color: "bg-amber-100 text-amber-700" },
  done: { label: "完了", color: "bg-emerald-100 text-emerald-700" }
};

function newId() { return "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

/* Inline input for adding items */
function InlineAdd({ placeholder, onConfirm, onCancel, autoFocus }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  const submit = () => {
    if (value.trim()) { onConfirm(value.trim()); setValue(""); }
    else { onCancel?.(); }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={ref} type="text" className="flex-1 px-3 py-2 rounded-lg border-2 border-blue-300 bg-white text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
        placeholder={placeholder} value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setValue(""); onCancel?.(); } }}
        onBlur={() => { if (!value.trim()) onCancel?.(); }}
      />
      <button type="button" className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shrink-0" onClick={submit}>
        <i className="fa-solid fa-check" />
      </button>
      <button type="button" className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 transition shrink-0" onClick={() => { setValue(""); onCancel?.(); }}>
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

/* Inline rename */
function InlineRename({ initial, onConfirm, onCancel }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) { ref.current.focus(); ref.current.select(); } }, []);

  const submit = () => {
    if (value.trim() && value.trim() !== initial) onConfirm(value.trim());
    else onCancel();
  };

  return (
    <input ref={ref} type="text" className="flex-1 px-2 py-1 rounded-md border-2 border-blue-300 bg-white text-sm font-bold focus:border-blue-500 focus:outline-none transition min-w-0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
      onBlur={submit}
    />
  );
}

export function PropertyRoomList({ properties, onPropertiesChange, onOpenRoom, userName, onLogout }) {
  const [selectedPropId, setSelectedPropId] = useState(() => properties[0]?.id || "");
  const [search, setSearch] = useState("");
  const [addingProp, setAddingProp] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [renamingPropId, setRenamingPropId] = useState(null);

  const selectedProp = properties.find((p) => p.id === selectedPropId);

  const addProperty = (name) => {
    const id = newId();
    onPropertiesChange([...properties, { id, name, address: "", rooms: [{ id: newId(), roomNo: "101号室", status: "pending", updatedAt: null }] }]);
    setSelectedPropId(id);
    setAddingProp(false);
  };

  const deleteProperty = (propId) => {
    if (!window.confirm("この物件を削除しますか？")) return;
    const next = properties.filter((p) => p.id !== propId);
    onPropertiesChange(next);
    if (selectedPropId === propId) setSelectedPropId(next[0]?.id || "");
  };

  const renameProperty = (propId, newName) => {
    onPropertiesChange(properties.map((p) => p.id !== propId ? p : { ...p, name: newName }));
    setRenamingPropId(null);
  };

  const addRoom = (name) => {
    if (!selectedProp) return;
    onPropertiesChange(properties.map((p) => p.id !== selectedProp.id ? p : {
      ...p, rooms: [...p.rooms, { id: newId(), roomNo: name, status: "pending", updatedAt: null }]
    }));
    setAddingRoom(false);
  };

  const deleteRoom = (propId, roomId) => {
    if (!window.confirm("この部屋を削除しますか？")) return;
    onPropertiesChange(properties.map((p) => p.id !== propId ? p : {
      ...p, rooms: p.rooms.filter((r) => r.id !== roomId)
    }));
  };

  const filteredProps = search.trim()
    ? properties.filter((p) => p.name.includes(search) || p.rooms.some((r) => r.roomNo.includes(search)))
    : properties;

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <i className="fa-solid fa-building text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">物件一覧</h1>
            <span className="text-xs text-slate-400 font-medium">HASEKO DX · 退去立会見積システム</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold">
              {(userName || "U")[0].toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{userName}</span>
          </div>
          <button type="button" className="text-xs text-slate-400 hover:text-rose-500 transition font-medium" onClick={onLogout}>
            <i className="fa-solid fa-right-from-bracket mr-1" />ログアウト
          </button>
        </div>
      </header>

      {/* Search + Add */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
          <input type="text" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            placeholder="物件名・部屋番号で検索" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!addingProp ? (
          <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
            onClick={() => setAddingProp(true)}>
            <i className="fa-solid fa-plus" /> 物件追加
          </button>
        ) : (
          <div className="w-72">
            <InlineAdd placeholder="物件名を入力" onConfirm={addProperty} onCancel={() => setAddingProp(false)} autoFocus />
          </div>
        )}
      </div>

      {/* Main: Master-Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Property List */}
        <div className="w-80 lg:w-96 border-r border-slate-200 bg-white overflow-y-auto shrink-0">
          <div className="p-3">
            {filteredProps.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-12">物件がありません</p>
            ) : (
              filteredProps.map((prop) => {
                const isSelected = prop.id === selectedPropId;
                const roomCount = prop.rooms.length;
                const doneCount = prop.rooms.filter((r) => r.status === "done").length;
                const isRenaming = renamingPropId === prop.id;
                return (
                  <button key={prop.id} type="button"
                    className={`w-full text-left rounded-xl p-4 mb-1.5 transition-all ${isSelected
                      ? "bg-blue-50 border-2 border-blue-200 shadow-sm"
                      : "bg-white border-2 border-transparent hover:bg-slate-50"}`}
                    onClick={() => setSelectedPropId(prop.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <i className="fa-solid fa-building text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {isRenaming ? (
                            <InlineRename initial={prop.name}
                              onConfirm={(n) => renameProperty(prop.id, n)}
                              onCancel={() => setRenamingPropId(null)} />
                          ) : (
                            <div className={`font-bold truncate ${isSelected ? "text-blue-900" : "text-slate-800"}`}>{prop.name}</div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {roomCount} 部屋{doneCount > 0 ? ` · ${doneCount}完了` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button type="button" className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-500 flex items-center justify-center transition text-xs"
                          onClick={(e) => { e.stopPropagation(); setRenamingPropId(prop.id); }} title="名称変更">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button type="button" className="w-7 h-7 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition text-xs"
                          onClick={(e) => { e.stopPropagation(); deleteProperty(prop.id); }} title="削除">
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Room List */}
        <div className="flex-1 overflow-y-auto">
          {selectedProp ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-800">{selectedProp.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedProp.rooms.length} 部屋</p>
                </div>
                {!addingRoom ? (
                  <button type="button" className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    onClick={() => setAddingRoom(true)}>
                    <i className="fa-solid fa-plus" /> 部屋追加
                  </button>
                ) : (
                  <div className="w-56">
                    <InlineAdd placeholder="部屋番号（例: 302号室）" onConfirm={addRoom} onCancel={() => setAddingRoom(false)} autoFocus />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {selectedProp.rooms.map((room) => {
                  const st = STATUS_MAP[room.status] || STATUS_MAP.pending;
                  return (
                    <div key={room.id}
                      className="group bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                      onClick={() => onOpenRoom(selectedProp.id, room.id)}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-white font-black text-sm">
                              {room.roomNo.replace(/[^0-9]/g, "").slice(0, 3) || "—"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-base">{room.roomNo}</div>
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${st.color}`}>{st.label}</span>
                            </div>
                          </div>
                          <button type="button" className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition text-xs"
                            onClick={(e) => { e.stopPropagation(); deleteRoom(selectedProp.id, room.id); }}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-2xl font-black num-font text-slate-900">{fmtYen(room.total)}</span>
                          <span className="text-[10px] text-slate-400">{fmtDate(room.updatedAt)}</span>
                        </div>
                      </div>
                      <div className="bg-blue-600 text-white text-center py-2.5 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fa-solid fa-pen-to-square mr-1.5" />見積作成
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <i className="fa-solid fa-building text-4xl mb-3 text-slate-200" />
                <p className="text-sm font-medium">左側から物件を選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
