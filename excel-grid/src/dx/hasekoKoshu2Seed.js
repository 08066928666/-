/**
 * 長谷工系 HTML の sel_koshu2_cd に相当する既定工種一覧（画面キャプチャ準拠）
 * id はシステム側の value と一致（文字列で保持）
 */
export const HASEKO_KOSHU2_SEED = [
  { id: "1", label: "クロス工事", koshu2_text: "クロス", discontinued: false },
  { id: "2", label: "床工事", koshu2_text: "床", discontinued: false },
  { id: "3", label: "建具工事", koshu2_text: "建具", discontinued: false },
  { id: "4", label: "鋼製建具工事(廃止)", koshu2_text: "鋼製建具", discontinued: true },
  { id: "5", label: "クリーニング工事", koshu2_text: "クリーニング", discontinued: false },
  { id: "6", label: "鍵工事", koshu2_text: "鍵", discontinued: false },
  { id: "7", label: "和室工事", koshu2_text: "和室", discontinued: false },
  { id: "8", label: "塗装工事", koshu2_text: "塗装", discontinued: false },
  { id: "9", label: "雑工事", koshu2_text: "雑", discontinued: false },
  { id: "10", label: "設備機器交換工事", koshu2_text: "設備機器", discontinued: false },
  { id: "11", label: "内装工事(廃止)", koshu2_text: "内装", discontinued: true },
  { id: "12", label: "必須工事", koshu2_text: "必須", discontinued: false },
  { id: "13", label: "固定工事", koshu2_text: "固定", discontinued: false },
  { id: "14", label: "設備点検(廃止)", koshu2_text: "設備点検", discontinued: true },
  { id: "15", label: "その他(廃止)", koshu2_text: "その他", discontinued: true },
  { id: "16", label: "交換工事", koshu2_text: "交換", discontinued: false },
  { id: "17", label: "アスベスト関連", koshu2_text: "アスベスト", discontinued: false }
];

/** 連続する「工事」を 1 つに（HTML 表記の取り残し対策） */
export function normalizeKojiLabelText(s) {
  let t = String(s || "").trim();
  while (/工事工事/.test(t)) t = t.replace(/工事工事+/g, "工事");
  return t.trim();
}

export function formatKoshuLine(c) {
  const label = String(c.label ?? c.name ?? "").trim();
  const sub = String(c.koshu2_text ?? "").trim();
  if (!label && !sub) return String(c.id ?? "");
  if (!sub || sub === label) return label || sub || String(c.id ?? "");
  if (label.includes("/")) return label || sub || String(c.id ?? "");
  return `${label} / ${sub}`;
}

/**
 * 上書き後に略称が正式名と同一になった場合、既定シードの略称に戻す（HTML 取込の取り違え修復）
 * @param {{ label?: string, koshu2_text?: string }} o 上書き
 * @param {{ label: string, koshu2_text: string }} seed シード行
 */
export function coalesceKoshuPairWithSeed(o, seed) {
  const label = String(o.label != null ? o.label : seed.label).trim();
  let koshu2_text = String(o.koshu2_text != null ? o.koshu2_text : seed.koshu2_text).trim();
  const seedSub = String(seed.koshu2_text ?? "").trim();
  if (label && koshu2_text === label && seedSub && seedSub !== label) koshu2_text = seedSub;
  return { label, koshu2_text };
}
