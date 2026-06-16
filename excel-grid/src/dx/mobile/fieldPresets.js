/** 手机端明細字段 — 点击 ▤ 预设（常见值） */

/** 場所 — クロス貼替で実見積に多い名称 */
export const BASHO_PRESETS = [
  "洋室",
  "洋室（左）",
  "洋室（右）",
  "洋室（奥）",
  "洋室（右WIC）",
  "洗面・トイレ",
  "洗面所",
  "トイレ",
  "玄関・廊下",
  "ＬＤＫ",
  "LD",
  "キッチン",
  "浴室",
  "洗濯室",
  "クローゼット",
  "廊下",
  "玄関"
];

export const BUI_PRESETS = ["壁", "天井", "床", "建具", "巾木", "扉"];

/** クロス㎡ — 整数 0〜100 + 小数 0.0〜0.9（双列ホイール） */
export function getPickerMode(fieldKey) {
  if (fieldKey === "taisho1" || fieldKey === "taisho2") return "decimal";
  if (BY_KEY[fieldKey]?.length) return "preset";
  return null;
}

export function hasFieldPicker(fieldKey) {
  return getPickerMode(fieldKey) != null;
}

export const MAKER_PRESETS = ["リリカラ", "サンゲツ", "トーソー", "東リ", "ルノン"];

export const HINBAN_PRESETS = ["SP2519", "SP9713", "FE23935", "FE23936"];

export const BIKO_PRESETS = [
  "経年劣化",
  "汚損",
  "補修跡",
  "家具跡",
  "現況優先",
  "アクセント面は現況",
  "エアコン交換",
  "標準品"
];

export const KOJI_NAIYO_PRESETS = ["貼替", "交換", "補修", "クリーニング", "撤去", "新設"];

export const COMMENT_PRESETS = [
  "※洋室アクセント面は現況です",
  "※現況優先",
  "※借主希望",
  "※オーナー様ご要望"
];

/** クロス貼替の実見積では 800 が最多、原紙は 1000 もあり */
export const TANKA_PRESETS = ["800", "1000", "1200", "1500", "2000"];

const BY_KEY = {
  basho: BASHO_PRESETS,
  bui: BUI_PRESETS,
  maker: MAKER_PRESETS,
  hinban: HINBAN_PRESETS,
  biko: BIKO_PRESETS,
  koji_naiyo: KOJI_NAIYO_PRESETS,
  teika: TANKA_PRESETS,
  comment: COMMENT_PRESETS
};

export function getPresetsForField(fieldKey) {
  return BY_KEY[fieldKey] || [];
}
