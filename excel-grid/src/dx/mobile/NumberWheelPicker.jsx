import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const ITEM_H = 44;
const PAD_ROWS = 2;

function nearestIndex(scrollTop) {
  return Math.max(0, Math.round(scrollTop / ITEM_H));
}

/**
 * iOS タイマー風の縦スクロール数字ホイール
 */
export function NumberWheelPicker({ options = [], value, onChange, ariaLabel = "数値を選択" }) {
  const listRef = useRef(null);
  const scrollEndTimer = useRef(null);
  const syncingRef = useRef(false);

  const scrollToValue = useCallback(
    (nextValue, smooth = false) => {
      const el = listRef.current;
      if (!el || !options.length) return;
      const idx = options.findIndex((o) => String(o) === String(nextValue));
      const targetIdx = idx >= 0 ? idx : 0;
      syncingRef.current = true;
      el.scrollTo({ top: targetIdx * ITEM_H, behavior: smooth ? "smooth" : "auto" });
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    },
    [options]
  );

  useLayoutEffect(() => {
    scrollToValue(value, false);
  }, [value, options, scrollToValue]);

  const emitSelection = useCallback(
    (idx) => {
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      const next = options[clamped];
      if (next == null) return;
      if (String(next) !== String(value)) {
        onChange?.(next);
        try {
          navigator.vibrate?.(4);
        } catch {
          /* ignore */
        }
      }
    },
    [onChange, options, value]
  );

  const handleScroll = () => {
    if (syncingRef.current) return;
    window.clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = window.setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const idx = nearestIndex(el.scrollTop);
      if (el.scrollTop !== idx * ITEM_H) {
        syncingRef.current = true;
        el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
        requestAnimationFrame(() => {
          syncingRef.current = false;
        });
      }
      emitSelection(idx);
    }, 80);
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
    <div className="number-wheel" style={{ "--wheel-item-h": `${ITEM_H}px` }}>
      <div className="number-wheel-highlight" aria-hidden="true" />
      <div className="number-wheel-fade number-wheel-fade-top" aria-hidden="true" />
      <div className="number-wheel-fade number-wheel-fade-bottom" aria-hidden="true" />
      <div
        ref={listRef}
        className="number-wheel-list"
        role="listbox"
        aria-label={ariaLabel}
        onScroll={handleScroll}
      >
        {Array.from({ length: PAD_ROWS }).map((_, i) => (
          <div key={`pad-top-${i}`} className="number-wheel-item number-wheel-item-spacer" aria-hidden="true" />
        ))}
        {options.map((opt) => {
          const active = String(opt) === String(value);
          return (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={active}
              className={`number-wheel-item ${active ? "is-active" : ""}`}
              onClick={() => {
                onChange?.(opt);
                scrollToValue(opt, true);
              }}
            >
              {opt}
            </button>
          );
        })}
        {Array.from({ length: PAD_ROWS }).map((_, i) => (
          <div key={`pad-bot-${i}`} className="number-wheel-item number-wheel-item-spacer" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
