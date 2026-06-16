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

/**
 * 天井㎡ — 実見積・原紙見積から抽出した代表値
 * 5.0=玄関廊下, 8.3=洗面, 9.6/9.7=洋室, 15.7=洋室(奥), 18.0+=LD系
 */
export const CEILING_M2_PRESETS = [
  "3.3",
  "5.0",
  "8.3",
  "8.8",
  "9.6",
  "9.7",
  "12.4",
  "15.7",
  "18.0",
  "33.8"
];

/**
 * 壁㎡ — 実見積・原紙見積から抽出した代表値
 * 2.3/4.6=WIC等小空间, 8.3=洗面, 11.5~17=洋室, 23.6=洋室全体, 30+=LD
 */
export const WALL_M2_PRESETS = [
  "2.3",
  "4.6",
  "8.3",
  "11.5",
  "16.3",
  "17.0",
  "21.6",
  "23.6",
  "30.0",
  "33.6"
];

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
  taisho1: CEILING_M2_PRESETS,
  taisho2: WALL_M2_PRESETS,
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
