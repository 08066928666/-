import React, { useEffect, useRef, useState } from "react";

/**
 * 输入框右侧按钮 → iOS 键盘切换器风格的预设弹层
 * 点击选项填入；也可直接在输入框自定义输入
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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const hasPresets = Array.isArray(presets) && presets.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  const selectPreset = (v) => {
    onChange(v);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled || !hasPresets) return;
    setOpen((v) => !v);
    try {
      navigator.vibrate?.(8);
    } catch {
      /* ignore */
    }
  };

  if (!hasPresets) {
    return (
      <input
        type={type}
        className={className}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className={`preset-input-wrap ${open ? "is-open" : ""}`} ref={wrapRef}>
      <input
        type={type}
        className={`preset-input-field ${className}`.trim()}
        value={value ?? ""}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="preset-trigger-btn"
        disabled={disabled}
        aria-label="よく使う値から選択"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <i className="fa-solid fa-bars-staggered" />
      </button>

      {open && (
        <div className="preset-popover" role="listbox" aria-label="よく使う値">
          <div className="preset-popover-arrow" />
          <div className="preset-popover-header">よく使う値</div>
          <div className="preset-popover-list">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={String(value) === String(p)}
                className={`preset-popover-item ${String(value) === String(p) ? "is-active" : ""}`}
                onClick={() => selectPreset(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="preset-popover-foot">入力欄で自由入力もできます</div>
        </div>
      )}
    </div>
  );
}

export function PresetFieldLabel({ label, hasPresets }) {
  return (
    <span className="mobile-field-label-row">
      <span>{label}</span>
      {hasPresets ? <span className="mobile-field-hint">▤ 選択</span> : null}
    </span>
  );
}
