import React, { useState } from "react";
import { MobileShell } from "./MobileShell.jsx";
import { fmtDate, fmtYen, STATUS_MAP, newId } from "../propertyShared.js";
import { InlineAdd } from "./inlineEditors.jsx";

export function PropertyDetailPage({
  property,
  onPropertiesChange,
  allProperties,
  onBack,
  onOpenRoom
}) {
  const [addingRoom, setAddingRoom] = useState(false);

  if (!property) {
    return (
      <MobileShell title="物件" onBack={onBack} backLabel="一覧">
        <p className="mobile-empty">物件が見つかりません</p>
      </MobileShell>
    );
  }

  const addRoom = (name) => {
    onPropertiesChange(
      allProperties.map((p) =>
        p.id !== property.id
          ? p
          : { ...p, rooms: [...p.rooms, { id: newId(), roomNo: name, status: "pending", updatedAt: null }] }
      )
    );
    setAddingRoom(false);
  };

  const deleteRoom = (roomId) => {
    if (!window.confirm("この部屋を削除しますか？")) return;
    onPropertiesChange(
      allProperties.map((p) =>
        p.id !== property.id ? p : { ...p, rooms: p.rooms.filter((r) => r.id !== roomId) }
      )
    );
  };

  const doneCount = property.rooms.filter((r) => r.status === "done").length;

  return (
    <MobileShell
      largeTitle
      title={property.name}
      subtitle={`${property.rooms.length} 部屋${doneCount > 0 ? ` · ${doneCount} 完了` : ""}`}
      onBack={onBack}
      backLabel="一覧"
    >
      <div className="ios-group">
        <div className="ios-group-header">
          <span>部屋</span>
          {!addingRoom && (
            <button type="button" className="ios-text-btn" onClick={() => setAddingRoom(true)}>
              追加
            </button>
          )}
        </div>

        {addingRoom && (
          <div className="ios-inset-group" style={{ marginBottom: "0.625rem" }}>
            <div className="ios-row">
              <InlineAdd
                placeholder="部屋番号（例: 302号室）"
                onConfirm={addRoom}
                onCancel={() => setAddingRoom(false)}
                autoFocus
              />
            </div>
          </div>
        )}

        {property.rooms.length === 0 ? (
          <p className="mobile-empty">部屋がありません</p>
        ) : (
          <div className="ios-inset-group">
            {property.rooms.map((room) => {
              const st = STATUS_MAP[room.status] || STATUS_MAP.pending;
              const roomNum = room.roomNo.replace(/[^0-9]/g, "").slice(0, 4) || "—";
              return (
                <div key={room.id}>
                  <button
                    type="button"
                    className="ios-row"
                    onClick={() => onOpenRoom(property.id, room.id)}
                  >
                    <div className={`ios-row-icon ${room.status === "done" ? "green" : room.status === "draft" ? "orange" : "gray"}`}>
                      {roomNum}
                    </div>
                    <div className="ios-row-body">
                      <div className="ios-row-title">{room.roomNo}</div>
                      <span className={`mobile-status-pill ${st.color}`}>{st.label}</span>
                      <div className="ios-row-subtitle">更新: {fmtDate(room.updatedAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="ios-row-value num-font">{fmtYen(room.total)}</div>
                      <div className="ios-row-subtitle" style={{ fontSize: "0.6875rem", marginTop: 0 }}>
                        税込
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right ios-row-chevron" />
                  </button>
                  <div className="ios-row-actions">
                    <button
                      type="button"
                      className="ios-action-btn danger"
                      onClick={() => deleteRoom(room.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
