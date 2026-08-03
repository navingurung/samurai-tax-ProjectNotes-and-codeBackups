# Shopify連携 - 完了までのロードマップ

## 目次

1. [テスト（フロントエンド・バックエンド）](#1-テストフロントエンドバックエンド)
2. [Linear issueの更新・修正](#2-linear-issueの更新修正)
3. [ドキュメント作成（各リポジトリ + システム設計）](#3-ドキュメント作成各リポジトリ--システム設計)
4. [コミット整理](#4-コミット整理)
5. [PR作成・レビュー依頼](#5-pr作成レビュー依頼)
6. [本番用Shopifyアプリの準備](#6-本番用shopifyアプリの準備)
7. [設定・環境変数の更新（.toml + .env）](#7-設定環境変数の更新toml--env)
8. [main / staging へのマージ](#8-main--staging-へのマージ)
9. [Shopify App Store 審査提出](#9-shopify-app-store-審査提出)
10. [審査待ち・対応](#10-審査待ち対応)
11. [完了](#11-完了)

---

## 1. テスト（フロントエンド・バックエンド）

- [ ] AdminBackend `shopify.py` — 全10 + 1エンドポイントのテスト（実施済み、今回のセッションで確認済み）
- [ ] samurai-tax-free-backend `shopify.py` — 全4エンドポイントのテスト（実施済み）
- [ ] フロントエンド — `CompanyDetails.jsx`（Shopify連携セクション）
- [ ] フロントエンド — `ShopDetail.jsx`（Shopify POS連携セクション）
- [ ] フロントエンド — `ShopifyTransactionSelector.tsx`（実施済み：SSE、検索、日付範囲、詳細ダイアログ）
- [ ] 既存のSquare/Smaregi機能が壊れていないことの回帰テスト
- [ ] `.test.tsx` の単体テストファイル作成（Square/Smaregiの既存テストと同じパターンで）
- [ ] エッジケース：複数店舗を持つ会社、店舗未連携の状態、トークン期限切れ時の挙動

## 2. Linear issueの更新・修正

- [ ] 該当するLinear issueに実装内容・変更点を反映
- [ ] SAM-350（リフレッシュトークン化）との関連を明記（Shopifyは既に両バックエンドが独立してリフレッシュする設計だが、Square/Smaregiの既存挙動と一致していることを記載）
- [ ] SAM-351（whoami叩くタイミング）とは別issueであることを明記
- [ ] 新規に見つかったバグ・改善点があれば新しいissueとして起票
  - 例：受領書番号（receipt number）と注文番号（order number）の不一致（デフォルトのPOSレシートには注文番号が印字されない場合がある）

## 3. ドキュメント作成（各リポジトリ + システム設計）

### 3-1. AdminBackend側
- [ ] `shopify.py` の役割・スコープ（OAuth・連携管理のみ、Admin API呼び出しはlocations取得のみ）
- [ ] 10 + 1エンドポイント一覧と用途
- [ ] トークンリフレッシュの所有権（AdminBackendが担当するケース）

### 3-2. samurai-tax-free-backend側
- [ ] `shopify.py` の役割・スコープ（Webhook受信・SSE配信・注文取得のみ）
- [ ] 4エンドポイント一覧と用途
- [ ] トークンリフレッシュの所有権（このバックエンドも独立してリフレッシュする理由）

### 3-3. システム設計書（全体像）
- [ ] AdminBackend ⇄ samurai-tax-free-backend ⇄ Shopify の全体アーキテクチャ図
- [ ] `Company` ⇄ `ShopifyStore` ⇄ `Shop` のリレーション図
- [ ] なぜ2つのバックエンドに分割したか（責務分離の理由）
- [ ] Webhook購読は `shopify.app.toml` で静的に管理する方針（コードでの動的登録はしない理由）
- [ ] **既知の制限事項として明記：**
  - 注文番号（`#1023`）と印字レシート番号（`#2-1020`など）は別物であり、デフォルト設定では一致しない場合がある
  - トークンリフレッシュは両バックエンドが独立して行う（Square/Smaregiの既存設計に合わせた判断）

## 4. コミット整理

- [ ] 論理的な単位でコミットを分割（バックエンド／フロントエンド／設定ファイルなど）
- [ ] コミットメッセージの規約確認（このプロジェクトの既存コミット規約に合わせる）
- [ ] 例：
  ```
  feat(admin-backend): add Shopify public app OAuth + store linking endpoints
  feat(pos-backend): add Shopify webhook, SSE, and order endpoints
  fix(pos-backend): correct JST timezone handling in order date filter
  fix(frontend): fix duplicate # and search mismatch in ShopifyTransactionSelector
  ```

## 5. PR作成・レビュー依頼

- [ ] AdminBackend PR
- [ ] samurai-tax-free-backend PR
- [ ] フロントエンド PR
- [ ] 各PRに変更内容のサマリー・テスト方法を記載
- [ ] Copilotレビューを有効化
- [ ] チームメンバーへレビュー依頼

## 6. 本番用Shopifyアプリの準備

- [ ] **決定事項：** `st-sandbox` を本番用として流用するか、新規にPartner Dashboardでアプリを作成するか
- [ ] 本番用アプリのクライアントID・シークレットを取得
- [ ] App Store掲載用コンテンツの準備（説明文、スクリーンショット、サポート連絡先、プライバシーポリシーURL）

## 7. 設定・環境変数の更新（.toml + .env）

### 7-1. `shopify.app.toml`
- [ ] `application_url` を本番URLに更新（staging環境は独自HTTPSがあるためngrok不要）
- [ ] 3つのWebhook購読URIを本番URLに更新
  - `/shopify/webhooks/compliance`（AdminBackend）
  - `/shopify/webhooks/app/uninstalled`（AdminBackend）
  - `/shopify/webhook`（samurai-tax-free-backend）
- [ ] `shopify app deploy` で反映

### 7-2. AdminBackend `.env`
- [ ] `SHOPIFY_CLIENT_ID`
- [ ] `SHOPIFY_CLIENT_SECRET`
- [ ] `SHOPIFY_API_VERSION`

### 7-3. samurai-tax-free-backend `.env`
- [ ] `SHOPIFY_CLIENT_ID`
- [ ] `SHOPIFY_CLIENT_SECRET`
- [ ] `SHOPIFY_API_VERSION`

> **注意：** `.toml` の変更は `shopify app deploy` でのみ反映される。`.env` は各バックエンドで個別に更新が必要（`.toml` の更新だけでは反映されない）— 今回のセッションで実際にハマった箇所。

## 8. main / staging へのマージ

- [ ] 全PRの承認確認
- [ ] staging環境へマージ・デプロイ
- [ ] staging環境で本番相当の動作確認（実際のShopify開発ストア or 本番アプリでの通しテスト）
- [ ] mainへマージ

## 9. Shopify App Store 審査提出

- [ ] 審査提出前チェックリスト再確認
  - [ ] Expiring offline access token 対応済み
  - [ ] HMAC検証（ページロード・Webhook）実装済み
  - [ ] CSP `frame-ancestors` ヘッダー設定済み
  - [ ] GDPR compliance Webhook 3種類が正しく動作
  - [ ] `app/uninstalled` Webhookが正しく動作
  - [ ] GraphQL Admin APIのみ使用（REST不使用）
- [ ] 審査申請を提出

## 10. 審査待ち・対応

- [ ] Shopifyからのフィードバック・指摘事項に対応
- [ ] 再提出が必要な場合は該当箇所を修正

## 11. 完了

- [ ] 承認後、正式リリース
- [ ] チーム内共有・振り返り
