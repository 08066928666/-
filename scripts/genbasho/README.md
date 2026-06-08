# 原紙見積書 → システム見積 パイプライン

原始データ → 工具処理 → RPA 導入

## 概要

1. **DB 構築** — システム上の過去見積（見積登録 HTML）から正しい明細を抽出し、工種別マスタ DB を作成
2. **原紙抽出** — 原紙見積テキストを工種別ロジックで解析（まずクロス貼替工事）
3. **DB 突合** — 類似度で DB 明細に置換。未マッチは固定ルールで整形し `_needs_review` を付与
4. **RPA 出力** — TSV / CSV で WinActor 等に渡す

## クイックスタート

```bash
# 1. DB 構築（システム HTML から）
node scripts/build-meisai-db.mjs

# 2. 原紙見積を処理（サンプル付属）
node scripts/run-genbasho-pipeline.mjs scripts/genbasho/samples/cross_genbasho_sample.txt
```

## クロス貼替工事の判断ロジック

| 行種別 | 判断基準 | 処理 |
|--------|----------|------|
| タイトル | 先頭番号 + `クロス貼替工事` 等 | 工種2行、品番（SP2519 等）を `type` に |
| 明細 | 単位・数量・単価・合計が揃う | 場所・部位（天井/壁）・数量を分割 |
| 寸法 | `2.1×3.45` 形式のみ | `dimensions` に保持（後続で zumen_suryo） |
| コメント | `※` 始まり | `row_kbn=4` でそのまま出力 |

## ファイル構成

```
scripts/
  lib/hasekoHtmlParse.mjs    # HTML 解析（DB 構築用）
  genbasho/
    textUtils.mjs            # 正規化・類似度
    meisaiDb.mjs             # DB 構築・突合
    pipeline.mjs             # メインパイプライン
    extractors/
      wallpaper.mjs          # クロス貼替抽出器
    data/meisai_db.json      # 生成 DB
    samples/                 # テスト用原紙
    out/                     # パイプライン出力
  build-meisai-db.mjs
  run-genbasho-pipeline.mjs
```

## 今後の拡張

- 設備工事・床工事など `extractors/` に追加
- 寸法行から `zumen_suryo` 自動計算
- PostgreSQL 永続化（`pg` 依存は既に package.json にあり）
