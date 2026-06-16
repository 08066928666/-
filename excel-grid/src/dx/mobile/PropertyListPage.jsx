import React, { useState } from "react";
import { MobileShell } from "./MobileShell.jsx";
import { fmtYen, newId } from "../propertyShared.js";
import { InlineAdd, InlineRename } from "./inlineEditors.jsx";

export function PropertyListPage({ properties, onPropertiesChange, onSelectProperty, userName, onLogout }) {
  const [search, setSearch] = useState("");
  const [addingProp, setAddingProp] = useState(false);
  const [renamingPropId, setRenamingPropId] = useState(null);

  const filtered = search.trim()
    ? properties.filter((p) => p.name.includes(search) || p.rooms.some((r) => r.roomNo.includes(search)))
    : properties;

  const addProperty = (name) => {
    const id = newId();
    onPropertiesChange([
      ...properties,
      { id, name, address: "", rooms: [{ id: newId(), roomNo: "101号室", status: "pending", updatedAt: null }] }
    ]);
    setAddingProp(false);
    onSelectProperty(id);
  };

  const deleteProperty = (propId, e) => {
    e.stopPropagation();
    if (!window.confirm("この物件を削除しますか？")) return;
    onPropertiesChange(properties.filter((p) => p.id !== propId));
  };

  const renameProperty = (propId, newName) => {
    onPropertiesChange(properties.map((p) => (p.id !== propId ? p : { ...p, name: newName })));
    setRenamingPropId(null);
  };

  return (
    <MobileShell
      title="物件一覧"
      subtitle="HASEKO DX · 退去立会見積"
      right={
        <button type="button" className="mobile-icon-btn text-slate-500" onClick={onLogout} title="ログアウト">
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      }
    >
      <div className="mobile-toolbar">
        <div className="mobile-search-wrap">
          <i className="fa-solid fa-magnifying-glass mobile-search-icon" />
          <input
            type="search"
            className="mobile-search"
            placeholder="物件名・部屋番号で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!addingProp ? (
          <button type="button" className="mobile-primary-btn" onClick={() => setAddingProp(true)}>
            <i className="fa-solid fa-plus" /> 物件追加
          </button>
        ) : (
          <InlineAdd placeholder="物件名を入力" onConfirm={addProperty} onCancel={() => setAddingProp(false)} autoFocus />
        )}
      </div>

      <div className="mobile-card-list">
        {filtered.length === 0 ? (
          <p className="mobile-empty">物件がありません</p>
        ) : (
          filtered.map((prop) => {
            const doneCount = prop.rooms.filter((r) => r.status === "done").length;
            const total = prop.rooms.reduce((s, r) => s + (Number(r.total) || 0), 0);
            const isRenaming = renamingPropId === prop.id;
            return (
              <button
                key={prop.id}
                type="button"
                className="mobile-prop-card"
                onClick={() => !isRenaming && onSelectProperty(prop.id)}
              >
                <div className="mobile-prop-card-main">
                  <div className="mobile-prop-icon">
                    <i className="fa-solid fa-building" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    {isRenaming ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <InlineRename
                          initial={prop.name}
                          onConfirm={(n) => renameProperty(prop.id, n)}
                          onCancel={() => setRenamingPropId(null)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="mobile-prop-name">{prop.name}</div>
                        <div className="mobile-prop-meta">
                          {prop.rooms.length} 部屋
                          {doneCount > 0 ? ` · ${doneCount} 完了` : ""}
                        </div>
                        <div className="mobile-prop-amount num-font">{fmtYen(total)}</div>
                      </>
                    )}
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 shrink-0" />
                </div>
                {!isRenaming && (
                  <div className="mobile-prop-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="mobile-chip-btn"
                      onClick={() => setRenamingPropId(prop.id)}
                    >
                      <i className="fa-solid fa-pen" /> 名称変更
                    </button>
                    <button type="button" className="mobile-chip-btn danger" onClick={(e) => deleteProperty(prop.id, e)}>
                      <i className="fa-solid fa-trash" /> 削除
                    </button>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="mobile-footer-hint">ログイン: {userName || "—"}</p>
    </MobileShell>
  );
}
