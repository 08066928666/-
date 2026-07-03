# Tokubai Hub（トクバイ・ハブ）

日本のスーパー・コンビニの**値下げ商品**をリアルタイムで確認し、オンライン予約・店頭受取ができるプラットフォーム MVP。

## 機能

### ユーザー向け
- 値下げ商品のリアルタイム一覧（カテゴリ・チェーン・検索フィルタ）
- 店舗一覧と在庫数表示
- カート・予約注文（店頭受取）
- 受取コード（QR 相当）による受取確認
- ユーザー登録・ログイン

### 店舗管理者向け
- 値下げ商品の登録・在庫更新・削除
- 注文管理（受取可能・受取完了・キャンセル）
- キャンセル時の在庫自動復元

## 技術スタック

- **Next.js 14** (App Router)
- **Prisma 7** + SQLite
- **Tailwind CSS**
- **JWT** セッション認証

## セットアップ

```bash
cd tokubai-hub
npm install
npm run db:setup   # マイグレーション + シードデータ
npm run dev
```

http://localhost:3000 でアクセス

## デモアカウント（パスワード: `demo1234`）

| 役割 | メール |
|------|--------|
| 一般ユーザー | user@example.com |
| 店舗管理者 | merchant@seven.jp |
| 管理者 | admin@tokubai.jp |

## ページ構成

| パス | 説明 |
|------|------|
| `/` | ランディングページ |
| `/products` | 値下げ商品一覧 |
| `/stores` | 店舗一覧 |
| `/cart` | カート・予約 |
| `/orders` | 注文履歴 |
| `/login` | ログイン |
| `/register` | 新規登録 |
| `/merchant` | 店舗管理（MERCHANT/ADMIN） |

## 今後の拡張案

- POS システム API 連携
- 地図表示（Google Maps）
- プッシュ通知
- オンライン決済（PayPay 等）
- 多言語対応
