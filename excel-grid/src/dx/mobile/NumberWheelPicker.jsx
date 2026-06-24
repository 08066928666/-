import React from "react";
import { WheelColumn, WHEEL_ITEM_H, WHEEL_PAD_ROWS, WHEEL_VISIBLE_ROWS } from "./WheelColumn.jsx";

/**
 * 単一列プリセット数字ホイール（単価など）
 */
export function NumberWheelPicker({ options = [], value, onChange, ariaLabel = "数値を選択" }) {
  if (!options.length) return null;
  return (
    <WheelColumn options={options} value={value} onChange={onChange} ariaLabel={ariaLabel} />
  );
}

export const WHEEL_PICKER_HEIGHT = WHEEL_ITEM_H * WHEEL_VISIBLE_ROWS + WHEEL_PAD_ROWS * 2 * WHEEL_ITEM_H;
