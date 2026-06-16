import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const POPOVER_EST_HEIGHT = 240;
const VIEWPORT_PAD = 12;
const GAP = 8;

function getViewportBox() {
  const vv = window.visualViewport;
  if (!vv) {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }
  return {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    width: vv.width,
    height: vv.height
  };
}

function computePopoverStyle(triggerEl, popoverEl) {
  const rect = triggerEl.getBoundingClientRect();
  const popH = popoverEl?.offsetHeight || POPOVER_EST_HEIGHT;
  const vp = getViewportBox();
  const edgePad = VIEWPORT_PAD;
  const maxW = Math.min(288, vp.width - edgePad * 2);
  const left = Math.min(
    Math.max(vp.left + edgePad, rect.right - maxW),
    vp.left + vp.width - maxW - edgePad
  );

  const spaceAbove = rect.top - vp.top - edgePad;
  const spaceBelow = vp.top + vp.height - rect.bottom - edgePad;
  const minHeight = 120;
  const placeBelow = spaceBelow >= minHeight && (spaceBelow >= popH || spaceBelow >= spaceAbove);

  if (placeBelow) {
    const maxHeight = Math.max(minHeight, spaceBelow - GAP);
    return {
      placement: "below",
      top: rect.bottom + GAP,
      left,
      width: maxW,
      maxHeight,
      arrowLeft: Math.min(maxW - 20, Math.max(16, rect.right - left - 10))
    };
  }

  const maxHeight = Math.max(minHeight, spaceAbove - GAP);
  const top = Math.max(vp.top + edgePad, rect.top - Math.min(popH, maxHeight) - GAP);
  return {
    placement: "above",
    top,
    left,
    width: maxW,
    maxHeight,
    arrowLeft: Math.min(maxW - 20, Math.max(16, rect.right - left - 10))
  };
}

/**
 * 输入框右侧按钮 → iOS 风格预设弹层（fixed + portal，避免被卡片裁剪）
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
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hasPresets = Array.isArray(presets) && presets.length > 0;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPos(computePopoverStyle(triggerRef.current, popoverRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    requestAnimationFrame(updatePosition);
  }, [open, presets.length, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onReflow = () => updatePosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    window.visualViewport?.addEventListener("resize", onReflow);
    window.visualViewport?.addEventListener("scroll", onReflow);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      window.visualViewport?.removeEventListener("resize", onReflow);
      window.visualViewport?.removeEventListener("scroll", onReflow);
    };
  }, [open, updatePosition]);

  const selectPreset = (v) => {
    onChange(v);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (disabled || !hasPresets) return;
    setOpen((v) => {
      const next = !v;
      if (next && triggerRef.current) {
        setPos(computePopoverStyle(triggerRef.current, null));
      } else if (!next) {
        setPos(null);
      }
      return next;
    });
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

  const popover =
    open &&
    pos &&
    createPortal(
      <>
        <button
          type="button"
          className="preset-popover-backdrop"
          aria-label="閉じる"
          onClick={() => setOpen(false)}
        />
        <div
          ref={popoverRef}
          className={`preset-popover preset-popover-fixed preset-popover-${pos.placement}`}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            "--preset-arrow-left": `${pos.arrowLeft}px`
          }}
          role="listbox"
          aria-label="よく使う値"
        >
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
      </>,
      document.body
    );

  return (
    <>
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
          ref={triggerRef}
          type="button"
          className="preset-trigger-btn"
          disabled={disabled}
          aria-label="よく使う値から選択"
          aria-expanded={open}
          onClick={toggleOpen}
        >
          <i className="fa-solid fa-bars-staggered" />
        </button>
      </div>
      {popover}
    </>
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
