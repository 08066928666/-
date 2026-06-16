import React, { useCallback, useRef, useState } from "react";

const LONG_PRESS_MS = 480;

/**
 * 长按弹出预设；短按/直接输入为自定义内容
 */
export function PresetInput({
  value,
  onChange,
  presets = [],
  type = "text",
  disabled = false,
  placeholder = "",
  className = "",
  inputMode,
  step
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const timerRef = useRef(null);
  const hasPresets = Array.isArray(presets) && presets.length > 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openSheet = useCallback(() => {
    if (disabled || !hasPresets) return;
    setSheetOpen(true);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
  }, [disabled, hasPresets]);

  const onTouchStart = useCallback(() => {
    if (disabled || !hasPresets) return;
    clearTimer();
    timerRef.current = setTimeout(openSheet, LONG_PRESS_MS);
  }, [disabled, hasPresets, clearTimer, openSheet]);

  const onTouchEnd = useCallback(() => clearTimer(), [clearTimer]);

  const onContextMenu = useCallback(
    (e) => {
      if (!hasPresets) return;
      e.preventDefault();
      openSheet();
    },
    [hasPresets, openSheet]
  );

  const selectPreset = (v) => {
    onChange(v);
    setSheetOpen(false);
  };

  return (
    <>
      <input
        type={type}
        className={`${className} ${hasPresets ? "has-presets" : ""}`.trim()}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onContextMenu={onContextMenu}
      />
      {sheetOpen && (
        <div className="preset-sheet-root" role="dialog" aria-modal="true">
          <button type="button" className="preset-sheet-overlay" aria-label="閉じる" onClick={() => setSheetOpen(false)} />
          <div className="preset-sheet">
            <div className="preset-sheet-handle" />
            <div className="preset-sheet-title">よく使う値</div>
            <p className="preset-sheet-hint">タップで選択 · 入力欄では自由入力できます</p>
            <div className="preset-sheet-list">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset-sheet-item ${String(value) === String(p) ? "is-active" : ""}`}
                  onClick={() => selectPreset(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button type="button" className="preset-sheet-close" onClick={() => setSheetOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PresetFieldLabel({ label, hasPresets }) {
  return (
    <span className="mobile-field-label-row">
      <span>{label}</span>
      {hasPresets ? <span className="mobile-field-hint">長押しで選択</span> : null}
    </span>
  );
}
