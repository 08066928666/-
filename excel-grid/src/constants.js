/**
 * 工種・メニュー定数（Tampermonkey 等インポート用・長谷工系フィールド相当）
 */
export const CATEGORY_DEFS = [
  { id: "wallpaper", label: "クロス工事", koshu1_text: "内装工事", koshu2_text: "クロス", sel_koshu2_cd: "001" },
  { id: "floor", label: "床工事", koshu1_text: "内装工事", koshu2_text: "床", sel_koshu2_cd: "003" },
  { id: "equipment", label: "設備工事", koshu1_text: "設備工事", koshu2_text: "設備", sel_koshu2_cd: "002" },
  { id: "water", label: "給排水工事", koshu1_text: "設備工事", koshu2_text: "給排水", sel_koshu2_cd: "006" },
  { id: "electric", label: "電気工事", koshu1_text: "設備工事", koshu2_text: "電気", sel_koshu2_cd: "007" },
  { id: "joinery", label: "建具工事", koshu1_text: "内装工事", koshu2_text: "建具", sel_koshu2_cd: "004" },
  { id: "cleaning", label: "清掃工事", koshu1_text: "清掃工事", koshu2_text: "清掃", sel_koshu2_cd: "005" },
  { id: "paint", label: "塗装工事", koshu1_text: "内装工事", koshu2_text: "塗装", sel_koshu2_cd: "008" },
  { id: "aircon", label: "空調工事", koshu1_text: "設備工事", koshu2_text: "空調", sel_koshu2_cd: "009" },
  { id: "misc", label: "諸雑工事", koshu1_text: "諸雑", koshu2_text: "諸雑", sel_koshu2_cd: "012" }
];

/** 水栓「品番」：選択で単価・単位・type（品番）・maker を補完 */
export const SUITO_HINBAN = [
  { key: "GROHE-MX01", code: "GR-MX01", name: "シングルレバー混合栓(クロム)", taisho1: "混合水栓交換(シングル・クロム)", tani: "式", tanka: 12000 },
  { key: "KVK-KM50", code: "KM5008T", name: "寒冷地対応 混合水栓", taisho1: "混合水栓交換(KM系 寒冷地)", tani: "式", tanka: 14000 },
  { key: "TOTO-TLN33", code: "TLN33TSE", name: "台付シングル(泡沫)混合栓", taisho1: "水栓交換(台付・泡沫)", tani: "式", tanka: 11000 },
  { key: "LIXIL-LF1", code: "LF-24S3", name: "エコシングル(泡沫)", taisho1: "水栓交換(泡沫エコ)", tani: "式", tanka: 13500 }
];

/** 明細サブ種別：水栓交換フロー用 */
export const LINE_PRESET_OPTIONS = [{ value: "", label: "（通常行）" }, { value: "faucet", label: "水栓交換" }];

/** インポート用 xlsx の列順 */
export const EXPORT_HEADERS = [
  "row_kbn",
  "koshu1_text",
  "koshu2_koban",
  "sel_koshu2_cd",
  "koshu2_text",
  "taisho1",
  "taisho2",
  "koji_naiyo",
  "basho",
  "bui",
  "zumen_suryo",
  "suryo",
  "tani",
  "tanka",
  "kakaku",
  "kashinushi_futan_wariai",
  "kashinushi_futan_kingaku",
  "karinushi_futan_wariai",
  "karinushi_futan_kingaku",
  "biko1",
  "maker",
  "type",
  "comment"
];

/** 約20行プリセット（クロス／床／設備ほか） */
export const HASEKO_STANDARD_TEMPLATE = [
  { categoryId: "wallpaper", taisho1: "クロス貼替(玄関廊下)", basho: "玄関・廊下", bui: "天井", koji_naiyo: "", suryo: 4.2, tani: "㎡", tanka: 800, biko1: "経年" },
  { categoryId: "wallpaper", taisho1: "クロス貼替(玄関廊下)", basho: "玄関・廊下", bui: "壁", koji_naiyo: "", suryo: 12.0, tani: "㎡", tanka: 800, biko1: "" },
  { categoryId: "wallpaper", taisho1: "アクセントクロス", basho: "ＬＤＫ", bui: "壁", koji_naiyo: "アクセント", suryo: 6.5, tani: "㎡", tanka: 1500, biko1: "" },
  { categoryId: "wallpaper", taisho1: "天井クロス", basho: "洋室", bui: "天井", koji_naiyo: "", suryo: 8.0, tani: "㎡", tanka: 1200, biko1: "" },
  { categoryId: "wallpaper", taisho1: "巾木", basho: "各室", bui: "巾木", koji_naiyo: "", suryo: 18.0, tani: "ｍ", tanka: 900, biko1: "ソフト巾木" },
  { categoryId: "floor", taisho1: "床材張替(フローリング)", basho: "ＬＤＫ", bui: "床", koji_naiyo: "", suryo: 18.5, tani: "㎡", tanka: 4500, biko1: "汚損" },
  { categoryId: "floor", taisho1: "建具枠 補修", basho: "各室", bui: "建具", koji_naiyo: "小修繕", suryo: 1.0, tani: "式", tanka: 8000, biko1: "" },
  { categoryId: "equipment", taisho1: "温水洗浄便座 交換", basho: "トイレ", bui: "便座", koji_naiyo: "", suryo: 1, tani: "台", tanka: 18000, biko1: "現状優先" },
  { categoryId: "equipment", taisho1: "レンジフード 交換", basho: "キッチン", bui: "換気", koji_naiyo: "", suryo: 1, tani: "台", tanka: 35000, biko1: "" },
  { categoryId: "equipment", taisho1: "浴室換気扇 交換", basho: "浴室", bui: "換気", koji_naiyo: "", suryo: 1, tani: "台", tanka: 22000, biko1: "" },
  { categoryId: "water", taisho1: "混合水栓 交換", basho: "キッチン", bui: "水栓", koji_naiyo: "交換", suryo: 1, tani: "式", tanka: 12000, biko1: "" },
  { categoryId: "water", taisho1: "分岐水栓 新設", basho: "キッチン", bui: "水栓下", koji_naiyo: "新設", suryo: 1, tani: "式", tanka: 6000, biko1: "洗機接続" },
  { categoryId: "electric", taisho1: "ＬＥＤシーリング 交換", basho: "各室", bui: "照明", koji_naiyo: "", suryo: 3, tani: "台", tanka: 15000, biko1: "" },
  { categoryId: "joinery", taisho1: "建具 調整", basho: "洋室", bui: "扉", koji_naiyo: "可動", suryo: 1, tani: "式", tanka: 5000, biko1: "" },
  { categoryId: "aircon", taisho1: "室内機 分解洗浄", basho: "洋室", bui: "ＡＣ", koji_naiyo: "", suryo: 1, tani: "台", tanka: 12000, biko1: "" },
  { categoryId: "paint", taisho1: "箇所 塗装(壁)", basho: "ＬＤＫ", bui: "壁", koji_naiyo: "跡", suryo: 2.0, tani: "㎡", tanka: 2000, biko1: "追加工" },
  { categoryId: "cleaning", taisho1: "原状回復 清掃", basho: "全面", bui: "-", koji_naiyo: "入居前", suryo: 1, tani: "式", tanka: 25000, biko1: "" },
  { categoryId: "misc", taisho1: "鍵 交換(シリンダー)", basho: "玄関", bui: "シリンダ", koji_naiyo: "", suryo: 1, tani: "式", tanka: 15000, biko1: "セキュリティ" },
  { categoryId: "equipment", taisho1: "下駄箱 新設(オプション)", basho: "玄関", bui: "収納", koji_naiyo: "", suryo: 1, tani: "式", tanka: 0, biko1: "見積内訳用" },
  { categoryId: "electric", taisho1: "コンセント 増設(キッチン)", basho: "キッチン", bui: "壁", koji_naiyo: "", suryo: 1, tani: "箇所", tanka: 8000, biko1: "プレート別途" }
];
