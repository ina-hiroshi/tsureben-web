# Stripe 学校向け課金セットアップ

## 1. Stripe Product / Price の作成

```bash
npm install
STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
```

[`functions/billingConfig.js`](../functions/billingConfig.js) の `priceId` が更新されます。

## 2. Firebase Secrets

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

## 3. Webhook エンドポイント（本番）

Stripe Dashboard → Developers → Webhooks → エンドポイント追加:

```
https://asia-northeast1-<PROJECT_ID>.cloudfunctions.net/stripeWebhook
```

イベント:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## 4. ローカル Webhook 検証

```bash
stripe listen --forward-to https://asia-northeast1-<PROJECT_ID>.cloudfunctions.net/stripeWebhook
```

表示される `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定。

## 5. 既存無償校のマイグレーション

```bash
LEGACY_SCHOOL_ID=<既存の schoolId> npm run migrate:legacy-school
```

## 6. デプロイ

```bash
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules,hosting
```

## 7. 動作確認チェックリスト

- [ ] 公開 URL `/for-schools`（学校向け紹介）→ `/pricing` → ログイン（`/`）の導線が機能する（ログイン画面に学校向けリンクは出さない）
- [ ] `/for-schools` で機能スクリーンショットが表示される（スマホ: iPhone 画像、タブレット以上: iPad 画像）
- [ ] `/pricing` から Starter を選び Checkout 完了
- [ ] `/billing/success` で Google ログイン → 管理画面へ
- [ ] 管理画面で CSV 一括登録が成功
- [ ] super_admin の「契約・登録状況」にプラン・人数が表示
- [ ] school_admin の「契約・請求管理」で Stripe Portal が開く
- [ ] `legacy_free` 校は Portal なし・登録制限なし
- [ ] 未払い（`past_due`）で新規生徒登録が拒否される

## 料金プラン（税込・年払い）

| プラン | 年額 | 生徒上限 | トライアル |
|--------|------|----------|------------|
| Starter | ¥120,000 | 200 | 90日 |
| Standard | ¥240,000 | 500 | なし |
| Campus | ¥480,000 | 1,200 | なし |
