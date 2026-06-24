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

  return (
    <MobileShell title={property.name} subtitle={`${property.rooms.length} 部屋`} onBack={onBack} backLabel="一覧">
      <div className="mobile-toolbar">
        {!addingRoom ? (
          <button type="button" className="mobile-primary-btn" onClick={() => setAddingRoom(true)}>
            <i className="fa-solid fa-plus" /> 部屋追加
          </button>
        ) : (
          <InlineAdd
            placeholder="部屋番号（例: 302号室）"
            onConfirm={addRoom}
            onCancel={() => setAddingRoom(false)}
            autoFocus
          />
        )}
      </div>

      <div className="mobile-card-list">
        {property.rooms.length === 0 ? (
          <p className="mobile-empty">部屋がありません。上のボタンから追加してください。</p>
        ) : (
          property.rooms.map((room) => {
            const st = STATUS_MAP[room.status] || STATUS_MAP.pending;
            const roomNum = room.roomNo.replace(/[^0-9]/g, "").slice(0, 4) || "—";
            return (
              <div key={room.id} className="mobile-room-card">
                <button
                  type="button"
                  className="mobile-room-card-tap"
                  onClick={() => onOpenRoom(property.id, room.id)}
                >
                  <div className="mobile-room-badge">{roomNum}</div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="mobile-room-name">{room.roomNo}</div>
                    <span className={`mobile-status-pill ${st.color}`}>{st.label}</span>
                    <div className="mobile-room-amount num-font">{fmtYen(room.total)}</div>
                    <div className="mobile-room-amount-hint">税込</div>
                    <div className="mobile-room-date">更新: {fmtDate(room.updatedAt)}</div>
                  </div>
                  <div className="mobile-room-cta">
                    <span>見積編集</span>
                    <i className="fa-solid fa-chevron-right" />
                  </div>
                </button>
                <button
                  type="button"
                  className="mobile-room-delete"
                  onClick={() => deleteRoom(room.id)}
                  aria-label="部屋を削除"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </MobileShell>
  );
}
