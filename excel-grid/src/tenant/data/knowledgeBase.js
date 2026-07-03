/**
 * 退房无忧 — 知识库 & 保价数据（基于长谷工系见积样本整理）
 */

export const ISSUE_TYPES = [
  { id: "wallpaper_yellow", label: "壁纸发黄/水渍", icon: "fa-paint-roller", category: "wallpaper" },
  { id: "wallpaper_damage", label: "壁纸破损/孔洞", icon: "fa-house-crack", category: "wallpaper" },
  { id: "wallpaper_mark", label: "壁纸物跡/擦痕", icon: "fa-hand", category: "wallpaper" },
  { id: "floor_scratch", label: "地板划伤", icon: "fa-grip-lines", category: "floor" },
  { id: "floor_stain", label: "地板污渍/变色", icon: "fa-droplet", category: "floor" },
  { id: "door_damage", label: "建具破损/孔洞", icon: "fa-door-open", category: "joinery" },
  { id: "toilet_clean", label: "厕所清洁不足", icon: "fa-toilet", category: "cleaning" },
  { id: "kitchen_grease", label: "厨房油污", icon: "fa-kitchen-set", category: "cleaning" },
  { id: "faucet_leak", label: "水栓漏水/损坏", icon: "fa-faucet", category: "water" },
  { id: "ac_dirty", label: "空调脏污", icon: "fa-wind", category: "equipment" }
];

/** 责任认定参考 */
export const LIABILITY_RULES = {
  aging: { label: "経年劣化", tenantRate: 0, color: "emerald" },
  mark: { label: "物跡", tenantRate: 0, color: "emerald" },
  stain: { label: "汚損", tenantRate: 50, color: "amber" },
  damage: { label: "破損", tenantRate: 100, color: "rose" },
  negotiable: { label: "協議可能", tenantRate: 30, color: "amber" }
};

/** 各问题的详细对策 */
export const ISSUE_KNOWLEDGE = {
  wallpaper_yellow: {
    issueType: "wallpaper_yellow",
    title: "壁纸发黄 / 水渍",
    liability: "negotiable",
    riskLevel: "medium",
    priceRange: { min: 0, max: 15000, unit: "円", note: "全室貼替の場合は 800–1,200円/㎡" },
    selfFixable: true,
    cleaningTips: [
      "カビキラー泡スプレー（浴室・トイレ用）を試す",
      "オキシクリーンを薄めた液で軽く拭き取り（事前に目立たない場所でテスト）",
      "換気を十分に行い、完全乾燥後に再撮影して記録"
    ],
    negotiationScript: "「入居時からの経年変色・水アカと考えられます。ガイドライン上、通常使用の範囲内であれば借主負担とは言い切れません。清掃で改善可能な範囲か、立会前に確認させてください。」",
    avoidTrap: "管理会社が「カビ」と断定する場合、清掃前後の写真で反証。カビでなければ経年劣化として主張可能。",
    legalRef: "国土交通省「原状回復をめぐるトラブルとガイドライン」— 通常の使用による変色は経年劣化"
  },
  wallpaper_damage: {
    issueType: "wallpaper_damage",
    title: "壁纸破损 / 孔洞",
    liability: "damage",
    riskLevel: "high",
    priceRange: { min: 3000, max: 12000, unit: "円", note: "部分補修 3,000–8,000円 / 1枚貼替 8,000–12,000円" },
    selfFixable: false,
    cleaningTips: [
      "穴が小さい場合（画鋲程度）は補修テープ＋同系色ペンで応急処置可能",
      "周辺を汚さないよう養生してから補修"
    ],
    negotiationScript: "「破損は認めますが、全面貼替ではなく部分補修で対応可能ではないでしょうか。見積の内訳（㎡単価・施工範囲）をご提示ください。」",
    avoidTrap: "1箇所の穴で「その面全体の貼替」を請求されることがある。㎡数と施工範囲を必ず確認。",
    legalRef: "借主の故意・過失による破損は借主負担。ただし修繕方法は「最小限の原状回復」が原則"
  },
  wallpaper_mark: {
    issueType: "wallpaper_mark",
    title: "壁纸物跡 / 擦痕",
    liability: "mark",
    riskLevel: "low",
    priceRange: { min: 0, max: 5000, unit: "円", note: "物跡認定なら原則 0円" },
    selfFixable: true,
    cleaningTips: [
      "橡皮擦（消しゴム）で軽い擦痕を除去",
      "壁用クリーナー（中性）で優しく拭く",
      "家具配置跡は「物跡」として経年劣化に近い扱い"
    ],
    negotiationScript: "「家具・生活動線による物跡であり、通常使用の範囲内です。国土交通省ガイドラインでも物跡は経年劣化と同様の扱いが一般的です。」",
    avoidTrap: "物跡と破損の境界が曖昧な場合、管理会社は破損側に振りがち。入住時写真があれば最有力な反証。",
    legalRef: "物跡＝通常使用で生じた生活の痕跡。破損（穴・裂け）との区別が重要"
  },
  floor_scratch: {
    issueType: "floor_scratch",
    title: "地板划伤",
    liability: "negotiable",
    riskLevel: "medium",
    priceRange: { min: 0, max: 45000, unit: "円", note: "部分補修 5,000–15,000円 / 張替 4,000–5,000円/㎡" },
    selfFixable: true,
    cleaningTips: [
      "フローリング用リペアキット（ワックス入り）で浅い傷を埋める",
      "家具の引きずり傷は「物跡」寄りの判断も可能",
      "傷の深さを定規で撮影し、記録に残す"
    ],
    negotiationScript: "「傷の深さ・範囲を確認の上、部分補修で足りる場合は全面張替を求める必要はありません。見積の工事内容を明細でご提示ください。」",
    avoidTrap: "数cmの傷でLDK全体の床張替（数十万円）を請求されるケースあり。㎡と箇所を必ず確認。",
    legalRef: "床材の経年変色・軽微な傷は経年劣化。深い傷・広範囲の破損のみ借主負担"
  },
  floor_stain: {
    issueType: "floor_stain",
    title: "地板污渍 / 变色",
    liability: "stain",
    riskLevel: "medium",
    priceRange: { min: 0, max: 25000, unit: "円", note: "清掃で対応可能なら 0–5,000円" },
    selfFixable: true,
    cleaningTips: [
      "フローリング用クリーナーで拭き取り",
      "シミが残る場合はサンドペーパー（#240）で軽く研磨後ワックス",
      "ペット尿等の変色は汚損扱いになりやすい—早めの対処を"
    ],
    negotiationScript: "「清掃・ワックスがけで回復可能な汚れです。回復不能な場合のみ修繕費を協議させてください。」",
    avoidTrap: "「変色＝張替必須」と言われても、清掃で改善するケースは多い。事前清掃の証拠写真を残す。",
    legalRef: "汚損の程度と修繳方法の相当性が争点。過大な張替請求は減額交渉の余地大"
  },
  door_damage: {
    issueType: "door_damage",
    title: "建具破损 / 孔洞",
    liability: "damage",
    riskLevel: "high",
    priceRange: { min: 8000, max: 35000, unit: "円", note: "補修 8,000–15,000円 / 扉交換 25,000–35,000円" },
    selfFixable: false,
    cleaningTips: [
      "小さな穴は木製パテ＋サンドペーパー＋塗装で補修可能な場合あり",
      "ドアノブ周りの傷は補修テープで応急対応"
    ],
    negotiationScript: "「扉全体の交換ではなく、補修で対応可能な規模です。当社（または第三者）の見積と比較検討させてください。」",
    avoidTrap: "トイレ扉に1穴 → 扉交換＋枠交換のセット請求。補修可能性を必ず職人に確認。",
    legalRef: "建具の破損は借主負担が原則だが、修繕方法・価格の妥当性は争える"
  },
  toilet_clean: {
    issueType: "toilet_clean",
    title: "厕所清洁不足",
    liability: "stain",
    riskLevel: "low",
    priceRange: { min: 3000, max: 8000, unit: "円", note: "プロ清掃 5,000–8,000円 / 自助可なら 0円" },
    selfFixable: true,
    cleaningTips: [
      "塩酸系トイレクリーナー（カルキ汚れ用）",
      "トイレの縁・床の接地面は特にチェック",
      "換気扇・照明も忘れずに"
    ],
    negotiationScript: "「退去前にプロ仕様の清掃を実施済みです（写真・日時記録あり）。追加清掃費の根拠をお示しください。」",
    avoidTrap: "「清掃費」として原状回復と別に請求されることがある。契約書の清掃範囲を確認。",
    legalRef: "通常の清掃は借主負担が一般的だが、金額の妥当性は問える"
  },
  kitchen_grease: {
    issueType: "kitchen_grease",
    title: "厨房油污",
    liability: "stain",
    riskLevel: "medium",
    priceRange: { min: 5000, max: 15000, unit: "円", note: "レンジフード分解清掃 8,000–12,000円" },
    selfFixable: true,
    cleaningTips: [
      "重曹＋お湯でレンジフードフィルター浸け置き",
      "換気扇・コンロ周りの油汚れはキッチンハイター等",
      "シンク・排水口も忘れずに"
    ],
    negotiationScript: "「通常の油汚れは清掃で除去可能です。機器交換が必要なレベルか、立会時に確認させてください。」",
    avoidTrap: "レンジフードの「交換」ではなく「分解清掃」で足りるケースが大半。",
    legalRef: "油汚れ＝汚損だが、清掃で回復可能なら張替・交換は不要"
  },
  faucet_leak: {
    issueType: "faucet_leak",
    title: "水栓漏水 / 损坏",
    liability: "negotiable",
    riskLevel: "medium",
    priceRange: { min: 12000, max: 14000, unit: "円", note: "混合水栓交換施工費 12,000–14,000円" },
    selfFixable: false,
    cleaningTips: [
      "パッキン交換で直る場合は数百円で済むことも",
      "漏水は放置すると床・壁の二次被害—早めに対処"
    ],
    negotiationScript: "「水栓の不具合が入居時からあった可能性があります。入居時チェックリスト・写真があれば提出します。」",
    avoidTrap: "「交換必須」と言われても、パッキン交換で済むことも。第三者見積を取得。",
    legalRef: "設備の故障原因（経年 vs 過失）で負担割合が変わる"
  },
  ac_dirty: {
    issueType: "ac_dirty",
    title: "空调脏污",
    liability: "stain",
    riskLevel: "low",
    priceRange: { min: 8000, max: 12000, unit: "円", note: "室内機分解洗浄 8,000–12,000円" },
    selfFixable: true,
    cleaningTips: [
      "フィルター清掃は自分で可能（義務のことが多い）",
      "内部のカビ・臭いはプロの分解洗浄が必要な場合あり"
    ],
    negotiationScript: "「フィルター清掃は実施済みです。内部洗浄が必要な場合は、汚れの程度を立会時に確認させてください。」",
    avoidTrap: "「エアコン交換」ではなく「分解洗浄」で足りることがほとんど。",
    legalRef: "フィルター清掃は借主負担が一般的。内部洗浄は契約・状態による"
  }
};

/** 按房间推荐的检查项 */
export const ROOM_TEMPLATES = [
  {
    id: "genkan",
    name: "玄関・廊下",
    icon: "fa-door-closed",
    tips: "下駄箱内部、扉の傷、壁の擦れを確認",
    suggestedIssues: ["wallpaper_mark", "floor_scratch", "door_damage"]
  },
  {
    id: "toilet",
    name: "トイレ",
    icon: "fa-toilet",
    tips: "便器周り、壁の水アカ、扉の傷を重点チェック",
    suggestedIssues: ["wallpaper_yellow", "toilet_clean", "door_damage"]
  },
  {
    id: "kitchen",
    name: "キッチン",
    icon: "fa-kitchen-set",
    tips: "レンジフード、コンロ、水栓、壁の油ハネ",
    suggestedIssues: ["kitchen_grease", "faucet_leak", "wallpaper_yellow"]
  },
  {
    id: "bathroom",
    name: "浴室",
    icon: "fa-bath",
    tips: "カビ・水アカ、換気扇、床の汚れ",
    suggestedIssues: ["wallpaper_yellow", "toilet_clean"]
  },
  {
    id: "living",
    name: "リビング・LDK",
    icon: "fa-couch",
    tips: "床の傷、壁の物跡、窓・サッシ",
    suggestedIssues: ["floor_scratch", "floor_stain", "wallpaper_mark"]
  },
  {
    id: "bedroom",
    name: "洋室・寝室",
    icon: "fa-bed",
    tips: "クロス物跡、床傷、建具、エアコン",
    suggestedIssues: ["wallpaper_mark", "wallpaper_damage", "floor_scratch", "ac_dirty"]
  }
];

/** 服务套餐 */
export const SERVICE_PLANS = [
  {
    id: "ai_report",
    name: "AI 深度报告",
    price: 1980,
    desc: "全房间 AI 分析 + 保价评估 + 话术 PDF"
  },
  {
    id: "expert_call",
    name: "专家 30 分钟咨询",
    price: 4980,
    desc: "原状回復のプロが個別アドバイス"
  },
  {
    id: "proxy",
    name: "人工代行服务",
    price: 29800,
    desc: "清掃・補修手配 + 立会同行 + 見積交渉"
  }
];
