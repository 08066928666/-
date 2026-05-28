import type { QuoteTreeDoc } from "./types";

/** Phase1：階層ビューの初期データ（ワークスペースから欠落していたため簡易再構成）。 */
export const MOCK_QUOTE_TREE: QuoteTreeDoc = {
  version: 1,
  roots: [
    {
      id: "lvl1-sample",
      label: "サンプル階層（Level1）",
      children: [
        {
          id: "lvl2-cross",
          koshuName: "クロス工事",
          seqLabel: "C-001",
          details: [{ id: "d1", description: "", qty: 1, unit: "式", unitPrice: 0 }]
        },
        {
          id: "lvl2-floor",
          koshuName: "床工事",
          seqLabel: "Y-002",
          details: [{ id: "d2", description: "", qty: 0, unit: "㎡", unitPrice: 0 }]
        }
      ]
    }
  ]
};
