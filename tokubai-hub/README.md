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
npm run demo
```

`npm run demo` は依存関係のインストール、`.env` 作成、データベース初期化、開発サーバー起動を一括で行います。

ブラウザで **http://localhost:3000** を開いてください。

### 手動セットアップ

```bash
cd tokubai-hub
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

### Cursor / リモート環境で開けない場合

1. ターミナルで `cd tokubai-hub && npm run demo` を実行
2. Cursor の **Ports（ポート）** パネルで `3000` を確認
3. 「Open in Browser」または「Port Visibility → Public」でブラウザを開く

`localhost:3000` はサーバーが動いているマシン上でのみ有効です。リモート環境ではポート転送が必要です。

### Windows でエラーが出る場合

`better-sqlite3` のビルドに Visual Studio Build Tools が必要な場合があります:

```bash
npm install --global windows-build-tools
```

または [Node.js LTS](https://nodejs.org/) を再インストール後、再度 `npm run demo` を試してください。

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
