import React, { useMemo } from "react";
import { WheelColumn, WHEEL_ITEM_H, WHEEL_PAD_ROWS, WHEEL_VISIBLE_ROWS } from "./WheelColumn.jsx";

const INT_OPTIONS = Array.from({ length: 101 }, (_, i) => i);
const DEC_OPTIONS = Array.from({ length: 10 }, (_, i) => i);

export function parseM2Value(raw) {
  const text = String(raw ?? "").trim().replace(/,/g, "");
  if (!text) return { int: 0, dec: 0 };
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n < 0) return { int: 0, dec: 0 };
  const clamped = Math.min(100.9, n);
  const int = Math.min(100, Math.floor(clamped));
  const dec = Math.min(9, Math.max(0, Math.round((clamped - int) * 10)));
  return { int, dec };
}

export function formatM2Value(int, dec) {
  return `${int}.${dec}`;
}

/**
 * クロス㎡用 — 整数列 + 小数列（0.1 単位、最大 100.9）
 */
export function DecimalWheelPicker({ value, onChange, ariaLabel = "㎡を選択", unit = "㎡" }) {
  const { int, dec } = useMemo(() => parseM2Value(value), [value]);
  const display = formatM2Value(int, dec);

  const patch = (nextInt, nextDec) => {
    const formatted = formatM2Value(nextInt, nextDec);
    if (String(formatted) !== String(value)) {
      onChange?.(formatted);
      try {
        navigator.vibrate?.(3);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="decimal-wheel">
      <div className="decimal-wheel-cols">
        <div className="decimal-wheel-col-wrap">
          <span className="decimal-wheel-col-label">整数</span>
          <WheelColumn
            options={INT_OPTIONS}
            value={int}
            onChange={(v) => patch(Number(v), dec)}
            ariaLabel={`${ariaLabel} 整数`}
          />
        </div>
        <span className="decimal-wheel-sep" aria-hidden="true">
          .
        </span>
        <div className="decimal-wheel-col-wrap decimal-wheel-col-dec">
          <span className="decimal-wheel-col-label">小数</span>
          <WheelColumn
            options={DEC_OPTIONS}
            value={dec}
            onChange={(v) => patch(int, Number(v))}
            ariaLabel={`${ariaLabel} 小数`}
          />
        </div>
      </div>
      <div className="decimal-wheel-preview">
        選択中 <strong className="num-font">{display}</strong> {unit}
      </div>
    </div>
  );
}

export const DECIMAL_WHEEL_POPOVER_HEIGHT =
  WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS + WHEEL_PAD_ROWS * 2 * WHEEL_ITEM_H + 56;
