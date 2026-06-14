# 原紙見積書 → システム明細 変換パイプライン

## 目的

```
原紙見積書 → ツール処理（抽出・DB突合・整形） → RPA 導入 → システム
```

システムからダウンロードした過去見積 HTML を **明細マスタ DB** として蓄積し、
原紙見積書テキストを工種別ロジックで解析、DB と突合して RPA 用データを出力します。

## クイックスタート

```bash
cd excel-grid

# 1. システム HTML から明細 DB を構築
npm run genkou:build-db

# 2. 原紙サンプル（クロス貼替工事）を処理
npm run genkou:test-cross

# 3. RPA CSV を出力
node scripts/process-genkou.mjs samples/genkou-cross-sample.txt --format rpa-csv -o data/genkou-rpa.csv
```

## データ型の判断（共通）

| 種別 | 判断基準 |
|------|----------|
| **明細** | 単位・数量・単価・合計が揃う行 |
| **標題** | 番号付き + 「〇〇工事」 |
| **コメント** | `※` で始まり、単位/数量/単価/合計が空 |
| **寸法** | `2.1×3.45` 形式のみ（補助情報） |

## クロス貼替工事（実装済み）

- `クロス貼替工事` → `koshu2_id=1`（クロス工事）
- 各場所の天井・壁 ㎡ を明細行に分割
- 品番（例: `SP2519`）→ `type` 欄
- `※` コメントは `row_kbn=4` として保持
- 寸法行は RPA 補助用に別出力（面積は明細行を優先）

## 工種別拡張

`parsers/registry.js` に工種パーサを追加:

```js
export const KOSHU_PARSERS = {
  cross: { ... },      // クロス工事 ✓
  equipment: { ... },  // 設備工事（今後）
};
```

## DB 構造

`data/meisai-db.json`:

```json
{
  "byKoshu2": {
    "1": {
      "label": "クロス工事",
      "entries": [
        {
          "taisho1": "クロス貼替え(量産品)",
          "basho": "玄関・廊下",
          "bui": "壁",
          "tani": "㎡",
          "tanka": 800,
          "kojikomoku_id": "270",
          "frequency": 3
        }
      ]
    }
  }
}
```

## 突合結果

| `_matchStatus` | 意味 |
|----------------|------|
| `db_hit` | DB の正規明細で置換（高精度） |
| `formatted_new` | DB に無く固定ルールで整形（`_needsReview: true`） |

## モジュール

| ファイル | 役割 |
|----------|------|
| `meisaiDatabase.js` | HTML → DB 構築・突合 |
| `genkouRowClassifier.js` | 行分類（明細/標題/コメント/寸法） |
| `parsers/crossWorkParser.js` | クロス工事専用ロジック |
| `genkouPipeline.js` | 全体オーケストレーション |
| `rpaExport.js` | RPA CSV / row_kbn 出力 |
