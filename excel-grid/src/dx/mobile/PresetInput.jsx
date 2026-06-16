import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DecimalWheelPicker, DECIMAL_WHEEL_POPOVER_HEIGHT } from "./DecimalWheelPicker.jsx";
import { NumberWheelPicker, WHEEL_PICKER_HEIGHT } from "./NumberWheelPicker.jsx";

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

function computePopoverStyle(triggerEl, popoverEl, estHeight = POPOVER_EST_HEIGHT) {
  const rect = triggerEl.getBoundingClientRect();
  const popH = popoverEl?.offsetHeight || estHeight;
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
 * 文字预设 → 列表弹层；数字预设 → コンパクト滚轮弹层（锚定在输入框旁）
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
  step,
  pickerTitle = "よく使う値",
  wheelMode = "preset"
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);
  const keyboardModeRef = useRef(false);
  const hasPresets = Array.isArray(presets) && presets.length > 0;
  const useDecimalWheel = type === "number" && wheelMode === "decimal";
  const usePresetWheel = type === "number" && wheelMode === "preset" && hasPresets;
  const useWheelPicker = useDecimalWheel || usePresetWheel;

  const wheelPopoverHeight = useDecimalWheel ? DECIMAL_WHEEL_POPOVER_HEIGHT : WHEEL_PICKER_HEIGHT;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPos(
      computePopoverStyle(
        triggerRef.current,
        popoverRef.current,
        useWheelPicker ? wheelPopoverHeight : POPOVER_EST_HEIGHT
      )
    );
  }, [useWheelPicker, wheelPopoverHeight]);

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

  const closePicker = () => {
    setOpen(false);
    setPos(null);
  };

  const selectPreset = (v) => {
    onChange(v);
    closePicker();
  };

  const openPicker = () => {
    if (disabled || !triggerRef.current) return;
    if (!useWheelPicker && !hasPresets) return;
    setPos(computePopoverStyle(triggerRef.current, null, useWheelPicker ? wheelPopoverHeight : POPOVER_EST_HEIGHT));
    setOpen(true);
    try {
      navigator.vibrate?.(6);
    } catch {
      /* ignore */
    }
  };

  const toggleOpen = () => {
    if (open) closePicker();
    else openPicker();
  };

  const focusKeyboard = () => {
    keyboardModeRef.current = true;
    closePicker();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
      window.setTimeout(() => {
        keyboardModeRef.current = false;
      }, 400);
    });
  };

  const handleNumericFocus = (e) => {
    if (!useWheelPicker || keyboardModeRef.current) return;
    e.target.blur();
    openPicker();
  };

  if (!hasPresets && !useDecimalWheel) {
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

  const popoverWidth = useWheelPicker
    ? Math.min(useDecimalWheel ? 248 : 220, window.innerWidth - VIEWPORT_PAD * 2)
    : pos?.width;

  const pickerPortal =
    open &&
    pos &&
    createPortal(
      <>
        <button type="button" className="preset-popover-backdrop" aria-label="閉じる" onClick={closePicker} />
        <div
          ref={popoverRef}
          className={`preset-popover preset-popover-fixed preset-popover-${pos.placement} ${useWheelPicker ? "preset-wheel-popover" : ""} ${useDecimalWheel ? "preset-decimal-popover" : ""}`}
          style={{
            top: pos.top,
            left: pos.left,
            width: popoverWidth,
            maxHeight: useWheelPicker ? undefined : pos.maxHeight,
            "--preset-arrow-left": `${pos.arrowLeft}px`
          }}
          role="dialog"
          aria-label={pickerTitle}
        >
          <div className="preset-popover-arrow" />
          {useDecimalWheel ? (
            <>
              <div className="preset-wheel-head">
                <span className="preset-wheel-title">{pickerTitle}</span>
                <button type="button" className="preset-wheel-close" aria-label="閉じる" onClick={closePicker}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <DecimalWheelPicker value={value ?? ""} onChange={onChange} ariaLabel={pickerTitle} unit="㎡" />
              <div className="preset-wheel-foot">
                <button type="button" className="preset-wheel-link" onClick={focusKeyboard}>
                  直接入力
                </button>
              </div>
            </>
          ) : usePresetWheel ? (
            <>
              <div className="preset-wheel-head">
                <span className="preset-wheel-title">{pickerTitle}</span>
                <button type="button" className="preset-wheel-close" aria-label="閉じる" onClick={closePicker}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <NumberWheelPicker
                options={presets}
                value={value ?? ""}
                onChange={onChange}
                ariaLabel={pickerTitle}
              />
              <div className="preset-wheel-foot">
                <button type="button" className="preset-wheel-link" onClick={focusKeyboard}>
                  直接入力
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="preset-popover-header">{pickerTitle}</div>
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
            </>
          )}
        </div>
      </>,
      document.body
    );

  return (
    <>
      <div className={`preset-input-wrap ${open ? "is-open" : ""} ${useWheelPicker ? "has-wheel" : ""}`} ref={wrapRef}>
        <input
          ref={inputRef}
          type={type}
          className={`preset-input-field ${className}`.trim()}
          value={value ?? ""}
          disabled={disabled}
          placeholder={placeholder}
          inputMode={inputMode}
          step={step}
          onFocus={useWheelPicker ? handleNumericFocus : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          ref={triggerRef}
          type="button"
          className={`preset-trigger-btn ${useWheelPicker ? "preset-trigger-wheel" : ""}`}
          disabled={disabled}
          aria-label={useWheelPicker ? "数字ホイールで選択" : "よく使う値から選択"}
          aria-expanded={open}
          onClick={toggleOpen}
        >
          {useWheelPicker ? (
            <span className="preset-wheel-glyph" aria-hidden="true">
              <i className="fa-solid fa-chevron-up" />
              <i className="fa-solid fa-chevron-down" />
            </span>
          ) : (
            <i className="fa-solid fa-bars-staggered" />
          )}
        </button>
      </div>
      {pickerPortal}
    </>
  );
}

export function PresetFieldLabel({ label, hasPresets, numeric = false }) {
  return (
    <span className="mobile-field-label-row">
      <span>{label}</span>
      {hasPresets ? <span className="mobile-field-hint">{numeric ? "↕ 選択" : "▤ 選択"}</span> : null}
    </span>
  );
}
