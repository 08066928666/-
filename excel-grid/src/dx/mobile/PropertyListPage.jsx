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
      largeTitle
      title="物件一覧"
      subtitle="HASEKO DX · 退去立会見積"
      right={
        <button type="button" className="mobile-icon-btn" onClick={onLogout} title="ログアウト">
          <i className="fa-solid fa-right-from-bracket" />
        </button>
      }
    >
      <div className="mobile-search-wrap">
        <i className="fa-solid fa-magnifying-glass mobile-search-icon" />
        <input
          type="search"
          className="mobile-search"
          placeholder="検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ios-group">
        <div className="ios-group-header">
          <span>物件</span>
          {!addingProp && (
            <button type="button" className="ios-text-btn" onClick={() => setAddingProp(true)}>
              追加
            </button>
          )}
        </div>

        {addingProp && (
          <div className="ios-inset-group" style={{ marginBottom: "0.625rem" }}>
            <div className="ios-row">
              <InlineAdd placeholder="物件名を入力" onConfirm={addProperty} onCancel={() => setAddingProp(false)} autoFocus />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="mobile-empty">物件がありません</p>
        ) : (
          <div className="ios-inset-group">
            {filtered.map((prop) => {
              const doneCount = prop.rooms.filter((r) => r.status === "done").length;
              const total = prop.rooms.reduce((s, r) => s + (Number(r.total) || 0), 0);
              const isRenaming = renamingPropId === prop.id;
              return (
                <div key={prop.id}>
                  {isRenaming ? (
                    <div className="ios-row">
                      <InlineRename
                        initial={prop.name}
                        onConfirm={(n) => renameProperty(prop.id, n)}
                        onCancel={() => setRenamingPropId(null)}
                      />
                    </div>
                  ) : (
                    <button type="button" className="ios-row" onClick={() => onSelectProperty(prop.id)}>
                      <div className="ios-row-icon blue">
                        <i className="fa-solid fa-building" />
                      </div>
                      <div className="ios-row-body">
                        <div className="ios-row-title">{prop.name}</div>
                        <div className="ios-row-subtitle">
                          {prop.rooms.length} 部屋
                          {doneCount > 0 ? ` · ${doneCount} 完了` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="ios-row-value num-font">{fmtYen(total)}</div>
                        <div className="ios-row-subtitle" style={{ fontSize: "0.6875rem", marginTop: 0 }}>
                          税込
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right ios-row-chevron" />
                    </button>
                  )}
                  {!isRenaming && (
                    <div className="ios-row-actions">
                      <button type="button" className="ios-action-btn" onClick={() => setRenamingPropId(prop.id)}>
                        名称変更
                      </button>
                      <button type="button" className="ios-action-btn danger" onClick={(e) => deleteProperty(prop.id, e)}>
                        削除
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mobile-footer-hint">ログイン: {userName || "—"}</p>
    </MobileShell>
  );
}
