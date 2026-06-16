import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const WHEEL_ITEM_H = 32;
export const WHEEL_PAD_ROWS = 1;
export const WHEEL_VISIBLE_ROWS = 3;

function nearestIndex(scrollTop) {
  return Math.max(0, Math.round(scrollTop / WHEEL_ITEM_H));
}

/**
 * 単一列スクロールホイール
 */
export function WheelColumn({
  options = [],
  value,
  onChange,
  ariaLabel = "選択",
  formatOption = (v) => v
}) {
  const listRef = useRef(null);
  const scrollEndTimer = useRef(null);
  const syncingRef = useRef(false);
  const [focusIdx, setFocusIdx] = useState(0);

  const scrollToIndex = useCallback((idx, smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    syncingRef.current = true;
    el.scrollTo({ top: idx * WHEEL_ITEM_H, behavior: smooth ? "smooth" : "auto" });
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  const scrollToValue = useCallback(
    (nextValue, smooth = false) => {
      if (!options.length) return;
      const idx = options.findIndex((o) => String(o) === String(nextValue));
      const targetIdx = idx >= 0 ? idx : 0;
      setFocusIdx(targetIdx);
      scrollToIndex(targetIdx, smooth);
    },
    [options, scrollToIndex]
  );

  useLayoutEffect(() => {
    scrollToValue(value, false);
  }, [value, options, scrollToValue]);

  const emitSelection = useCallback(
    (idx) => {
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      setFocusIdx(clamped);
      const next = options[clamped];
      if (next == null) return;
      if (String(next) !== String(value)) onChange?.(next);
    },
    [onChange, options, value]
  );

  const handleScroll = () => {
    if (syncingRef.current) return;
    const el = listRef.current;
    if (!el) return;
    const idx = nearestIndex(el.scrollTop);
    setFocusIdx(idx);
    window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      if (!listRef.current) return;
      const snapIdx = nearestIndex(listRef.current.scrollTop);
      if (listRef.current.scrollTop !== snapIdx * WHEEL_ITEM_H) {
        scrollToIndex(snapIdx, true);
      }
      emitSelection(snapIdx);
    }, 72);
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScrollEnd = () => {
      if (syncingRef.current) return;
      emitSelection(nearestIndex(el.scrollTop));
    };
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      el.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(scrollEndTimer.current);
    };
  }, [emitSelection]);

  if (!options.length) return null;

  return (
    <div
      className="number-wheel number-wheel-col"
      style={{ "--wheel-item-h": `${WHEEL_ITEM_H}px`, "--wheel-visible-rows": WHEEL_VISIBLE_ROWS }}
    >
      <div className="number-wheel-highlight" aria-hidden="true" />
      <div className="number-wheel-fade number-wheel-fade-top" aria-hidden="true" />
      <div className="number-wheel-fade number-wheel-fade-bottom" aria-hidden="true" />
      <div ref={listRef} className="number-wheel-list" role="listbox" aria-label={ariaLabel} onScroll={handleScroll}>
        {Array.from({ length: WHEEL_PAD_ROWS }).map((_, i) => (
          <div key={`pad-top-${i}`} className="number-wheel-item number-wheel-item-spacer" aria-hidden="true" />
        ))}
        {options.map((opt, idx) => {
          const dist = Math.abs(idx - focusIdx);
          return (
            <button
              key={String(opt)}
              type="button"
              role="option"
              aria-selected={dist === 0}
              className={`number-wheel-item ${dist === 0 ? "is-active" : ""} ${dist === 1 ? "is-near" : ""}`}
              onClick={() => {
                onChange?.(opt);
                scrollToValue(opt, true);
              }}
            >
              {formatOption(opt)}
            </button>
          );
        })}
        {Array.from({ length: WHEEL_PAD_ROWS }).map((_, i) => (
          <div key={`pad-bot-${i}`} className="number-wheel-item number-wheel-item-spacer" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
