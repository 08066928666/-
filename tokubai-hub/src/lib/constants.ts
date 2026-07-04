export const CATEGORY_LABELS: Record<string, string> = {
  BENTO: "弁当",
  SIDE_DISH: "おかず",
  SEASONING: "調味料",
  BREAD: "パン",
  DAIRY: "乳製品",
  SNACK: "スナック",
  BEVERAGE: "飲料",
  OTHER: "その他",
};

export const CHAIN_COLORS: Record<string, string> = {
  "セブン-イレブン": "bg-emerald-600",
  "ローソン": "bg-blue-600",
  "ファミリーマート": "bg-green-500",
  "イオン": "bg-orange-500",
  "まいばすけっと": "bg-yellow-500",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "受付中",
  CONFIRMED: "確認済み",
  READY: "受取可能",
  PICKED_UP: "受取完了",
  CANCELLED: "キャンセル",
};

export function formatPrice(yen: number) {
  return `¥${yen.toLocaleString("ja-JP")}`;
}

export function formatExpiry(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffMs <= 0) return "期限切れ";
  if (diffHours < 1) return `あと${diffMins}分`;
  if (diffHours < 24) return `あと${diffHours}時間${diffMins}分`;
  return d.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function generatePickupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
