import React, { useCallback, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

function newId(prefix = "id") { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }
function fmtYen(n) { const v = Math.round(Number(n) || 0); return v > 0 ? `¥${v.toLocaleString("ja-JP")}` : "—"; }

/* ═══════════════════════════════════════════
   Work Type Definitions
   ═══════════════════════════════════════════ */
const KOJI_TYPES = [
  {
    id: "harikae", label: "張替", icon: "fa-paint-roller",
    fields: [
      { key: "basho", label: "場所", flex: "1.5", minW: 80 },
      { key: "taisho1", label: "天井", flex: "1", minW: 55, type: "number" },
      { key: "taisho2", label: "壁", flex: "1", minW: 55, type: "number" },
    ],
    autoSuryo: (l) => Math.round(((Number(l.taisho1) || 0) + (Number(l.taisho2) || 0)) * 100) / 100,
    defaultTani: "㎡",
    totalUnit: "㎡",
  },
  {
    id: "koukan", label: "交換", icon: "fa-arrows-rotate",
    fields: [
      { key: "basho", label: "場所", flex: "1.2", minW: 70 },
      { key: "bui", label: "部位", flex: "1", minW: 60 },
      { key: "koji_naiyo", label: "内容", flex: "1.5", minW: 80 },
    ],
    autoSuryo: null,
    defaultTani: "台",
  },
  {
    id: "hoshu", label: "補修", icon: "fa-screwdriver-wrench",
    fields: [
      { key: "basho", label: "場所", flex: "1.2", minW: 70 },
      { key: "bui", label: "部位", flex: "1", minW: 60 },
      { key: "koji_naiyo", label: "内容", flex: "1.5", minW: 80 },
    ],
    autoSuryo: null,
    defaultTani: "箇所",
  },
  {
    id: "other", label: "汎用", icon: "fa-wrench",
    fields: [
      { key: "taisho1", label: "対象1", flex: "1.3", minW: 70 },
      { key: "taisho2", label: "対象2", flex: "1", minW: 60 },
      { key: "koji_naiyo", label: "工事内容", flex: "1.3", minW: 70 },
      { key: "basho", label: "場所", flex: "1", minW: 60 },
      { key: "bui", label: "部位", flex: "1", minW: 60 },
    ],
    autoSuryo: null,
    defaultTani: "式",
  },
];

function getKojiType(id) { return KOJI_TYPES.find((t) => t.id === id) || KOJI_TYPES[KOJI_TYPES.length - 1]; }

const TANI_OPTIONS = ["式", "㎡", "ｍ", "箇所", "本", "台", "個", "枚", "セット"];

function createLine(kojiTypeId = "other") {
  const kt = getKojiType(kojiTypeId);
  return { id: newId("ln"), type: "detail", lineType: kojiTypeId, active: true, taisho1: "", taisho2: "", koji_naiyo: "", basho: "", bui: "", suryo: kt.autoSuryo ? 0 : 1, tani: kt.defaultTani, maker: "", hinban: "", teika: 0, biko: "" };
}

function createComment(text = "") {
  return { id: newId("cmt"), type: "comment", text, active: true };
}

function createSection(name = "", kojiTypeId = "other") {
  return { id: newId("sec"), name, kojiType: kojiTypeId, lines: [createLine(kojiTypeId)] };
}

function inferKojiType(name) {
  if (/張替|クロス|ＣＦ|CF|壁紙/.test(name)) return "harikae";
  if (/交換|取替|取付/.test(name)) return "koukan";
  if (/補修|修繕|塗装/.test(name)) return "hoshu";
  return "other";
}

function defaultSections() {
  return [
    createSection("クロス張替工事", "harikae"),
    createSection("床張替工事", "harikae"),
    createSection("設備交換工事", "koukan"),
  ];
}

function isDetailLine(line) { return line.type !== "comment"; }

function getLineType(line, sectionKojiType) {
  return line.lineType || sectionKojiType || "other";
}

function calcLineSuryo(line, sectionKojiType) {
  const kt = getKojiType(getLineType(line, sectionKojiType));
  return kt.autoSuryo ? kt.autoSuryo(line) : (Number(line.suryo) || 0);
}

function calcLineAmount(line, sectionKojiType) {
  return calcLineSuryo(line, sectionKojiType) * (Number(line.teika) || 0);
}

function formatSummaryLabel(sectionName, defaultLabel) {
  const raw = (sectionName || "").trim();
  if (!raw) return defaultLabel;
  // Keep the estimate-sheet wording style: 張替 -> 貼替 (for summary row only)
  return raw.replace(/張替/g, "貼替").replace(/工事$/g, "");
}

function normalizeDetailLine(line, sectionKojiType) {
  const lineType = getLineType(line, sectionKojiType);
  const kt = getKojiType(lineType);
  const next = {
    id: line?.id || newId("ln"),
    type: "detail",
    lineType,
    active: line?.active !== false,
    taisho1: line?.taisho1 ?? "",
    taisho2: line?.taisho2 ?? "",
    koji_naiyo: line?.koji_naiyo ?? "",
    basho: line?.basho ?? "",
    bui: line?.bui ?? "",
    suryo: line?.suryo ?? (kt.autoSuryo ? 0 : 1),
    tani: line?.tani || kt.defaultTani,
    maker: line?.maker ?? "",
    hinban: line?.hinban ?? "",
    teika: line?.teika ?? 0,
    biko: line?.biko ?? "",
  };
  if (kt.autoSuryo) next.suryo = kt.autoSuryo(next);
  return next;
}

function normalizeSection(section) {
  const sectionKojiType = section?.kojiType || inferKojiType(section?.name || "");
  const rawLines = Array.isArray(section?.lines) ? section.lines : [];
  const lines = rawLines.map((line) => {
    if (line?.type === "comment") {
      return { id: line.id || newId("cmt"), type: "comment", text: line.text ?? "", active: line.active !== false };
    }
    return normalizeDetailLine(line, sectionKojiType);
  });
  return {
    id: section?.id || newId("sec"),
    name: section?.name ?? "",
    kojiType: sectionKojiType,
    lines: lines.length > 0 ? lines : [createLine(sectionKojiType)],
  };
}

/* ═══════════════════════════════════════════
   Typed Compact Line — per-line type
   ═══════════════════════════════════════════ */
function TypedCompactLine({ line, index, sectionKojiType, onPatch, onDelete, onDuplicate, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const lineTypeId = getLineType(line, sectionKojiType);
  const kt = getKojiType(lineTypeId);
  const isAuto = !!kt.autoSuryo;
  const suryo = isAuto ? kt.autoSuryo(line) : (Number(line.suryo) || 0);
  const amt = suryo * (Number(line.teika) || 0);
  const dim = !line.active;
  const hasSub = !!(line.maker || line.hinban || line.biko);
  const invalid = line.active !== false && !(line.basho || "").trim();

  const handlePatch = useCallback((patch) => {
    if (isAuto && (patch.taisho1 !== undefined || patch.taisho2 !== undefined)) {
      const merged = { ...line, ...patch };
      patch.suryo = kt.autoSuryo(merged);
    }
    onPatch(patch);
  }, [line, isAuto, kt, onPatch]);

  const handleTypeChange = useCallback((newTypeId) => {
    const newKt = getKojiType(newTypeId);
    const patch = { lineType: newTypeId, tani: newKt.defaultTani };
    if (newKt.autoSuryo) {
      patch.suryo = newKt.autoSuryo(line);
    }
    onPatch(patch);
  }, [line, onPatch]);

  return (
    <div className={`compact-line ${dim ? "compact-line-dim" : ""} ${hasSub ? "has-sub" : ""} ${invalid ? "compact-line-invalid" : ""}`}>
      <div className="compact-row">
        <span className="compact-num">{index + 1}</span>

        {/* Per-line type badge/selector */}
        <select className={`line-type-select line-type-${lineTypeId}`}
          value={lineTypeId}
          onChange={(e) => handleTypeChange(e.target.value)}
          title="明細タイプ">
          {KOJI_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {/* Type-specific fields */}
        {kt.fields.map((f) => (
          <div key={f.key} className="compact-cell" style={{ flex: f.flex, minWidth: f.minW }}>
            <input
              type={f.type === "number" ? "number" : "text"}
              className={`compact-input ${f.key === "basho" ? "font-bold" : ""} ${f.type === "number" ? "num-font text-right" : ""}`}
              value={line[f.key]}
              disabled={dim}
              placeholder={f.label}
              step={f.type === "number" ? "0.1" : undefined}
              onChange={(e) => handlePatch({ [f.key]: e.target.value })}
            />
          </div>
        ))}

        {/* Quantity */}
        {isAuto ? (
          <div className="compact-cell" style={{ width: 56 }}>
            <div className="compact-input num-font text-right auto-suryo">{suryo || ""}</div>
          </div>
        ) : (
          <div className="compact-cell" style={{ width: 56 }}>
            <input type="number" className="compact-input num-font text-right" value={line.suryo} disabled={dim} onChange={(e) => onPatch({ suryo: e.target.value })} />
          </div>
        )}

        <div className="compact-cell" style={{ width: 44 }}>
          <select className="compact-input compact-select" value={line.tani} disabled={dim} onChange={(e) => onPatch({ tani: e.target.value })}>
            {TANI_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="compact-cell" style={{ width: 70 }}>
          <input type="number" className="compact-input num-font text-right" value={line.teika} disabled={dim} placeholder="0" onChange={(e) => onPatch({ teika: e.target.value })} />
        </div>
        <div className="compact-cell" style={{ width: 80 }}>
          <div className="compact-amount">{fmtYen(amt)}</div>
        </div>
        <div className="compact-actions">
          <button type="button" className="compact-mini-btn" title="上へ" onClick={onMoveUp} disabled={!canMoveUp}>
            <i className="fa-solid fa-chevron-up" />
          </button>
          <button type="button" className="compact-mini-btn" title="下へ" onClick={onMoveDown} disabled={!canMoveDown}>
            <i className="fa-solid fa-chevron-down" />
          </button>
          <button type="button" className="compact-mini-btn" title="複製" onClick={onDuplicate}>
            <i className="fa-regular fa-copy" />
          </button>
          <label className="dx-switch" style={{ transform: "scale(0.75)" }}>
            <input type="checkbox" checked={line.active} onChange={() => onPatch({ active: !line.active })} />
            <span className="dx-slider" />
          </label>
          <button type="button" className="compact-del" onClick={onDelete}><i className="fa-solid fa-xmark" /></button>
        </div>
      </div>
      <div className="compact-row compact-row-sub">
        <span className="compact-num" style={{ visibility: "hidden" }}>0</span>
        <div className="compact-cell" style={{ flex: 1, minWidth: 60 }}>
          <input className="compact-input compact-input-sub" value={line.maker} disabled={dim} placeholder="メーカー" onChange={(e) => onPatch({ maker: e.target.value })} />
        </div>
        <div className="compact-cell" style={{ flex: 1, minWidth: 60 }}>
          <input className="compact-input compact-input-sub" value={line.hinban} disabled={dim} placeholder="品番" onChange={(e) => onPatch({ hinban: e.target.value })} />
        </div>
        <div className="compact-cell" style={{ flex: 2 }}>
          <input className="compact-input compact-input-sub" value={line.biko} disabled={dim} placeholder="備考" onChange={(e) => onPatch({ biko: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Comment Row
   ═══════════════════════════════════════════ */
function CommentRow({ line, onPatch, onDelete }) {
  return (
    <div className="comment-row">
      <i className="fa-solid fa-comment-dots comment-row-icon" />
      <input type="text" className="comment-row-input" value={line.text}
        placeholder="コメントを入力..."
        onChange={(e) => onPatch({ text: e.target.value })} />
      <button type="button" className="compact-del" onClick={onDelete}>
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Type Picker Modal
   ═══════════════════════════════════════════ */
function TypePicker({ onSelect, onClose }) {
  return (
    <div className="type-picker-overlay" onClick={onClose}>
      <div className="type-picker" onClick={(e) => e.stopPropagation()}>
        <div className="type-picker-title">工事タイプを選択</div>
        <div className="type-picker-grid">
          {KOJI_TYPES.map((kt) => (
            <button key={kt.id} type="button" className="type-picker-card"
              onClick={() => { onSelect(kt.id); onClose(); }}>
              <i className={`fa-solid ${kt.icon} type-picker-icon`} />
              <span className="type-picker-label">{kt.label}</span>
              <span className="type-picker-desc">
                {kt.fields.map((f) => f.label).join("・")}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Line Type Picker (inline for adding lines)
   ═══════════════════════════════════════════ */
function AddLineMenu({ sectionKojiType, onAddLine, onAddComment }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 shrink-0 relative">
      {/* Main add button — adds default type */}
      <button type="button" className="add-line-btn" onClick={() => onAddLine(sectionKojiType)}>
        <i className="fa-solid fa-plus" /> 明細
      </button>

      {/* Dropdown for other types */}
      <button type="button" className="add-line-more" onClick={() => setOpen(!open)} title="他のタイプで追加">
        <i className="fa-solid fa-caret-down" />
      </button>

      {open && (
        <>
          <div className="add-line-dropdown-overlay" onClick={() => setOpen(false)} />
          <div className="add-line-dropdown">
            {KOJI_TYPES.map((kt) => (
              <button key={kt.id} type="button" className="add-line-dropdown-item"
                onClick={() => { onAddLine(kt.id); setOpen(false); }}>
                <span className={`koji-type-badge koji-type-${kt.id}`}>{kt.label}</span>
                <span className="text-xs text-slate-600">{kt.fields.map((f) => f.label).join("・")}</span>
              </button>
            ))}
            <div className="add-line-dropdown-divider" />
            <button type="button" className="add-line-dropdown-item"
              onClick={() => { onAddComment(); setOpen(false); }}>
              <i className="fa-solid fa-comment-dots text-amber-500 text-xs" />
              <span className="text-xs text-slate-600">コメント追加</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SimpleQuoteEditor — Left: 工事 / Right: 明細
   ═══════════════════════════════════════════ */
export function SimpleQuoteEditor({ propertyName, roomNo, lines: initialLines, onSave, onBack }) {
  const [sections, setSections] = useState(() => {
    if (Array.isArray(initialLines) && initialLines.length > 0 && initialLines[0]?.lines) {
      return initialLines.map((s) => normalizeSection(s));
    }
    if (Array.isArray(initialLines) && initialLines.length > 0) {
      return [normalizeSection({ name: "工事", kojiType: "other", lines: initialLines })];
    }
    return defaultSections();
  });
  const [activeSecId, setActiveSecId] = useState(() => sections[0]?.id || "");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [lineSearch, setLineSearch] = useState("");
  const [lineTypeFilter, setLineTypeFilter] = useState("all");
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const [undoState, setUndoState] = useState(null);
  const bottomRef = useRef(null);
  const undoTimerRef = useRef(null);

  const activeSec = sections.find((s) => s.id === activeSecId) || sections[0];

  const allDetailLines = useMemo(() => sections.flatMap((s) => s.lines.filter(isDetailLine)), [sections]);
  const total = useMemo(() =>
    sections.reduce((sum, sec) =>
      sum + sec.lines.filter((l) => isDetailLine(l) && l.active !== false).reduce((s, l) =>
        s + calcLineAmount(l, sec.kojiType), 0), 0), [sections]);
  const tax = Math.floor(total * 0.1);
  const grand = total + tax;

  const secTotal = useCallback((sec) =>
    sec.lines.filter((l) => isDetailLine(l) && l.active !== false).reduce((s, l) =>
      s + calcLineAmount(l, sec.kojiType), 0), []);

  const secTotalQty = useCallback((sec, lineTypeFilter = null) =>
    sec.lines
      .filter((l) => isDetailLine(l) && l.active !== false)
      .filter((l) => !lineTypeFilter || getLineType(l, sec.kojiType) === lineTypeFilter)
      .reduce((s, l) => s + calcLineSuryo(l, sec.kojiType), 0), []);

  const updateSection = useCallback((secId, updater) => {
    setSections((prev) => prev.map((s) => s.id !== secId ? s : updater(s)));
    setSaved(false);
    setDirty(true);
  }, []);

  const queueUndo = useCallback((payload) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoState(payload);
    undoTimerRef.current = setTimeout(() => setUndoState(null), 8000);
  }, []);

  const patchLine = useCallback((lineId, patch) => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => ({
      ...s, lines: s.lines.map((l) => {
        if (l.id !== lineId) return l;
        const updated = { ...l, ...patch };
        if (isDetailLine(updated)) {
          const kt = getKojiType(getLineType(updated, s.kojiType));
          if (kt.autoSuryo) updated.suryo = kt.autoSuryo(updated);
        }
        return updated;
      })
    }));
  }, [activeSec, updateSection]);

  const deleteLine = useCallback((lineId) => {
    if (!activeSec) return;
    let removed = null;
    let removedIndex = -1;
    updateSection(activeSec.id, (s) => {
      removedIndex = s.lines.findIndex((l) => l.id === lineId);
      if (removedIndex < 0) return s;
      removed = s.lines[removedIndex];
      const next = s.lines.filter((l) => l.id !== lineId);
      return { ...s, lines: next.length > 0 ? next : [createLine(s.kojiType)] };
    });
    if (removed && removedIndex >= 0) {
      queueUndo({ type: "line", sectionId: activeSec.id, index: removedIndex, item: removed });
    }
  }, [activeSec, updateSection, queueUndo]);

  const addLine = useCallback((lineTypeId) => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => ({ ...s, lines: [...s.lines, createLine(lineTypeId)] }));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [activeSec, updateSection]);

  const addComment = useCallback(() => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => ({ ...s, lines: [...s.lines, createComment()] }));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [activeSec, updateSection]);

  const duplicateLine = useCallback((lineId) => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => {
      const idx = s.lines.findIndex((l) => l.id === lineId);
      if (idx < 0) return s;
      const source = s.lines[idx];
      const copy = source.type === "comment"
        ? { ...source, id: newId("cmt") }
        : normalizeDetailLine({ ...source, id: newId("ln") }, s.kojiType);
      const next = [...s.lines];
      next.splice(idx + 1, 0, copy);
      return { ...s, lines: next };
    });
  }, [activeSec, updateSection]);

  const moveLine = useCallback((lineId, dir) => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => {
      const idx = s.lines.findIndex((l) => l.id === lineId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= s.lines.length) return s;
      const next = [...s.lines];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ...s, lines: next };
    });
  }, [activeSec, updateSection]);

  const clearEmptyLines = useCallback(() => {
    if (!activeSec) return;
    updateSection(activeSec.id, (s) => {
      const next = s.lines.filter((line) => {
        if (line.type === "comment") return (line.text || "").trim().length > 0;
        const noText = !(line.basho || "").trim() && !(line.taisho1 || "").toString().trim() && !(line.taisho2 || "").toString().trim()
          && !(line.koji_naiyo || "").trim() && !(line.bui || "").trim() && !(line.maker || "").trim() && !(line.hinban || "").trim()
          && !(line.biko || "").trim();
        const noPrice = (Number(line.teika) || 0) === 0;
        const noQty = (Number(line.suryo) || 0) <= 1;
        return !(noText && noPrice && noQty);
      });
      return { ...s, lines: next.length > 0 ? next : [createLine(s.kojiType)] };
    });
  }, [activeSec, updateSection]);

  const handleAddSection = useCallback((kojiTypeId) => {
    const sec = createSection("", kojiTypeId);
    setSections((prev) => [...prev, sec]);
    setActiveSecId(sec.id);
    setSaved(false);
  }, []);

  const deleteSection = useCallback((secId) => {
    let removed = null;
    let removedIndex = -1;
    setSections((prev) => {
      removedIndex = prev.findIndex((s) => s.id === secId);
      if (removedIndex < 0) return prev;
      removed = prev[removedIndex];
      const next = prev.filter((s) => s.id !== secId);
      if (activeSecId === secId && next.length > 0) setActiveSecId(next[0].id);
      return next;
    });
    setSaved(false);
    setDirty(true);
    if (removed && removedIndex >= 0) {
      queueUndo({ type: "section", index: removedIndex, item: removed });
    }
  }, [activeSecId, queueUndo]);

  const renameSection = useCallback((secId, name) => {
    updateSection(secId, (s) => ({ ...s, name }));
  }, [updateSection]);

  /* ── Drag & Drop reorder ── */
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);
  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropIdx(idx);
  }, []);
  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) {
      setSections((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(dragIdx, 1);
        arr.splice(dropIdx, 0, moved);
        return arr;
      });
      setSaved(false);
      setDirty(true);
    }
    setDragIdx(null);
    setDropIdx(null);
  }, [dragIdx, dropIdx]);
  const handleDragLeave = useCallback(() => { setDropIdx(null); }, []);

  const moveSection = useCallback((secId, dir) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === secId);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
    setSaved(false);
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave(sections);
    setSaved(true);
    setDirty(false);
    setLastSavedAt(new Date());
    setTimeout(() => setSaved(false), 2500);
  }, [sections, onSave]);

  const handleUndoDelete = useCallback(() => {
    if (!undoState) return;
    if (undoState.type === "line") {
      updateSection(undoState.sectionId, (s) => {
        if (!s) return s;
        const next = [...s.lines];
        const at = Math.max(0, Math.min(undoState.index, next.length));
        next.splice(at, 0, undoState.item);
        return { ...s, lines: next };
      });
    } else if (undoState.type === "section") {
      setSections((prev) => {
        if (prev.some((s) => s.id === undoState.item.id)) return prev;
        const next = [...prev];
        const at = Math.max(0, Math.min(undoState.index, next.length));
        next.splice(at, 0, undoState.item);
        return next;
      });
      setActiveSecId(undoState.item.id);
      setSaved(false);
      setDirty(true);
    }
    setUndoState(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, [undoState, updateSection]);

  const visibleLines = useMemo(() => {
    if (!activeSec) return [];
    const search = lineSearch.trim().toLowerCase();
    return activeSec.lines.filter((line) => {
      if (line.type === "comment") {
        return search ? (line.text || "").toLowerCase().includes(search) : true;
      }
      const typeOk = lineTypeFilter === "all" || getLineType(line, activeSec.kojiType) === lineTypeFilter;
      if (!typeOk) return false;
      if (!search) return true;
      return [
        line.basho, line.taisho1, line.taisho2, line.koji_naiyo, line.bui,
        line.maker, line.hinban, line.biko,
      ].some((v) => String(v || "").toLowerCase().includes(search));
    });
  }, [activeSec, lineSearch, lineTypeFilter]);

  const exportXlsx = useCallback(() => {
    const headers = ["工事項目", "明細タイプ", "No", "場所", "天井/対象1", "壁/対象2", "工事内容", "部位", "数量", "単位", "単価", "金額", "メーカー", "品番", "備考"];
    const data = [];
    sections.forEach((sec) => {
      let detailIdx = 0;
      sec.lines.forEach((l) => {
        if (l.type === "comment") {
          data.push([sec.name, "コメント", "", l.text]);
        } else {
          detailIdx++;
          const lt = getKojiType(getLineType(l, sec.kojiType));
          const q = lt.autoSuryo ? lt.autoSuryo(l) : (Number(l.suryo) || 0);
          data.push([sec.name, lt.label, detailIdx, l.basho, l.taisho1, l.taisho2, l.koji_naiyo, l.bui,
            q, l.tani, Number(l.teika) || 0, q * (Number(l.teika) || 0), l.maker, l.hinban, l.biko]);
        }
      });
    });
    data.push([], ["", "", "", "", "", "", "", "", "", "", "合計（税抜）", total]);
    data.push(["", "", "", "", "", "", "", "", "", "", "消費税", tax]);
    data.push(["", "", "", "", "", "", "", "", "", "", "合計（税込）", grand]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "見積明細");
    XLSX.writeFile(wb, `${propertyName}_${roomNo}_見積.xlsx`);
  }, [sections, propertyName, roomNo, total, tax, grand]);

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition text-sm" onClick={onBack}>
            <i className="fa-solid fa-chevron-left" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">{propertyName}</span>
              <span className="text-sm font-bold text-blue-600">{roomNo}</span>
              {dirty && <span className="editor-dirty-dot" title="未保存" />}
            </div>
            <span className="text-[10px] text-slate-400">{allDetailLines.length}件 · {sections.length}工事</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 leading-none">税込合計</div>
            <div className="text-lg font-black num-font text-slate-900">{fmtYen(grand)}</div>
            {lastSavedAt && <div className="text-[10px] text-slate-400 leading-none mt-0.5">保存: {lastSavedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</div>}
          </div>
          <button type="button" className="editor-tool-btn" onClick={exportXlsx} title="xlsx出力">
            <i className="fa-solid fa-file-excel text-green-600" />
          </button>
          <button type="button"
            className={`px-3.5 py-1.5 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${saved ? "bg-emerald-500 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"}`}
            onClick={handleSave}>
            <i className={`fa-solid ${saved ? "fa-check" : "fa-save"}`} /> {saved ? "済" : "保存"}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Section List */}
        <div className="koji-sidebar">
          <div className="koji-sidebar-title">
            <i className="fa-solid fa-folder-tree text-blue-500" />
            <span>工事項目</span>
          </div>
          <div className="koji-sidebar-list">
            {sections.map((sec, idx) => {
              const st = secTotal(sec);
              const isActive = sec.id === activeSec?.id;
              const isDragging = dragIdx === idx;
              const isDropTarget = dropIdx === idx && dragIdx !== idx;
              return (
                <div key={sec.id} draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                  className={`koji-sidebar-item ${isActive ? "koji-sidebar-item-active" : ""} ${isDragging ? "koji-sidebar-dragging" : ""} ${isDropTarget ? "koji-sidebar-drop-target" : ""}`}
                  onClick={() => setActiveSecId(sec.id)}>
                  <div className="koji-drag-handle" title="ドラッグで並び替え">
                    <i className="fa-solid fa-grip-vertical" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <input type="text" className="koji-sidebar-name" value={sec.name} placeholder="工事名"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => renameSection(sec.id, e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 pl-0.5">
                      <span className="text-[10px] text-slate-400 num-font">{sec.lines.filter(isDetailLine).length}件</span>
                      <span className="text-[11px] font-bold num-font text-slate-500">{fmtYen(st)}</span>
                    </div>
                  </div>
                  <div className="koji-sidebar-actions">
                    <button type="button" className="koji-move-btn" title="上へ"
                      onClick={(e) => { e.stopPropagation(); moveSection(sec.id, -1); }} disabled={idx === 0}>
                      <i className="fa-solid fa-chevron-up" />
                    </button>
                    <button type="button" className="koji-move-btn" title="下へ"
                      onClick={(e) => { e.stopPropagation(); moveSection(sec.id, 1); }} disabled={idx === sections.length - 1}>
                      <i className="fa-solid fa-chevron-down" />
                    </button>
                    <button type="button" className="koji-sidebar-del" onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }}>
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="koji-sidebar-add" onClick={() => setShowTypePicker(true)}>
            <i className="fa-solid fa-plus" /> 工事追加
          </button>
        </div>

        {/* Right: Detail Lines */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSec ? (
            <>
              {/* Section header */}
              <div className="shrink-0">
                <div className="estimate-title-bar">
                  <span className="font-black">{activeSec.name || "工事"}</span>
                  <AddLineMenu
                    sectionKojiType={activeSec.kojiType}
                    onAddLine={addLine}
                    onAddComment={addComment}
                  />
                </div>
                <div className="line-tools-bar">
                  <div className="line-tools-left">
                    <input
                      type="text"
                      className="line-search-input"
                      placeholder="明細検索（場所・内容・備考）"
                      value={lineSearch}
                      onChange={(e) => setLineSearch(e.target.value)}
                    />
                    <select
                      className="line-filter-select"
                      value={lineTypeFilter}
                      onChange={(e) => setLineTypeFilter(e.target.value)}
                    >
                      <option value="all">全タイプ</option>
                      {KOJI_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <button type="button" className="line-clean-btn" onClick={clearEmptyLines}>
                    <i className="fa-solid fa-broom" /> 空行整理
                  </button>
                </div>
                {/* Summary for sections that have totalUnit */}
                {(() => {
                  const defKt = getKojiType(activeSec.kojiType);
                  if (activeSec.kojiType !== "harikae") return null;
                  return (
                    <>
                      <div className="estimate-summary-bar">
                        <span className="font-bold text-slate-700">{formatSummaryLabel(activeSec.name, defKt.label)}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-500">総{defKt.totalUnit}</span>
                          <span className="text-sm font-black num-font text-slate-800">{secTotalQty(activeSec, activeSec.kojiType).toFixed(1)}{defKt.totalUnit}</span>
                        </div>
                      </div>
                      <div className="estimate-breakdown-header">
                        <span className="estimate-uchiwake">【内訳】</span>
                        <span className="compact-cell" style={{ flex: "1.5", minWidth: 80 }}>場所</span>
                        <span className="compact-cell" style={{ flex: "1", minWidth: 55 }}>天井</span>
                        <span className="compact-cell" style={{ flex: "1", minWidth: 55 }}>壁</span>
                        <span style={{ width: 56 }}>数量</span>
                        <span style={{ width: 44 }}>単位</span>
                        <span style={{ width: 70 }}>単価</span>
                        <span style={{ width: 80 }}>金額</span>
                        <span style={{ width: 64 }} />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Lines — no fixed column headers since types vary per line */}
              <div className="flex-1 overflow-y-auto bg-white">
                {visibleLines.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <i className="fa-solid fa-clipboard text-3xl text-slate-200 mb-3" />
                    <p className="text-sm font-medium">{lineSearch || lineTypeFilter !== "all" ? "条件に一致する明細がありません" : "明細がありません"}</p>
                  </div>
                ) : (
                  (() => {
                    let detailIdx = 0;
                    return visibleLines.map((line) => {
                      if (line.type === "comment") {
                        return (
                          <CommentRow key={line.id} line={line}
                            onPatch={(patch) => patchLine(line.id, patch)}
                            onDelete={() => deleteLine(line.id)} />
                        );
                      }
                      const idx = detailIdx++;
                      return (
                        <TypedCompactLine key={line.id} line={line} index={idx}
                          sectionKojiType={activeSec.kojiType}
                          onPatch={(patch) => patchLine(line.id, patch)}
                          onDelete={() => deleteLine(line.id)}
                          onDuplicate={() => duplicateLine(line.id)}
                          onMoveUp={() => moveLine(line.id, -1)}
                          onMoveDown={() => moveLine(line.id, 1)}
                          canMoveUp={activeSec.lines.findIndex((l) => l.id === line.id) > 0}
                          canMoveDown={activeSec.lines.findIndex((l) => l.id === line.id) < activeSec.lines.length - 1}
                        />
                      );
                    });
                  })()
                )}
                <div ref={bottomRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p className="text-sm">左から工事を選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 shrink-0 flex items-center justify-end z-20 gap-3">
        <span className="text-[11px] text-slate-400 num-font hidden sm:block">税抜 {fmtYen(total)} + 税 {fmtYen(tax)}</span>
        <span className="text-xl font-black num-font text-slate-900">{fmtYen(grand)}</span>
      </div>

      {undoState && (
        <div className="undo-toast">
          <span className="text-sm text-slate-700">
            {undoState.type === "section" ? "工事を削除しました" : "明細を削除しました"}
          </span>
          <button type="button" className="undo-toast-btn" onClick={handleUndoDelete}>
            戻す
          </button>
        </div>
      )}

      {showTypePicker && (
        <TypePicker onSelect={handleAddSection} onClose={() => setShowTypePicker(false)} />
      )}
    </div>
  );
}
