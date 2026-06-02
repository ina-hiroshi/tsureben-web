# Firebase App Check 設定手順

## 概要

`src/utils/appCheck.js` が reCAPTCHA v3 プロバイダで App Check を初期化します。環境変数が未設定の場合は **スキップ** され、既存の開発フローはそのまま動作します。

## 環境変数（Web / Capacitor 共通ビルド）

| 変数 | 用途 |
|------|------|
| `VITE_APPCHECK_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 サイトキー（本番・ステージング） |
| `VITE_APPCHECK_DEBUG_TOKEN` | ローカル / 審査用デバッグトークン（開発のみ） |

`.env` は git に含めません（`.gitignore` 参照）。

## Firebase Console

1. **Build → App Check** で Web アプリに reCAPTCHA v3 を登録
2. まず **モニタリング** でトラフィックを確認
3. 問題なければ **Firestore** と **Cloud Functions** を「強制」に切り替え

## ローカル開発

1. Console → App Check → アプリ → **デバッグトークン** を管理
2. ブラウザコンソールに表示されるトークンを登録するか、`.env` に `VITE_APPCHECK_DEBUG_TOKEN` を設定
3. `npm run dev` で動作確認

## iOS（Capacitor）

WKWebView 上の Firebase JS SDK では reCAPTCHA v3 が使われます。審査・TestFlight 前に実機で Firestore / Callable が通ることを確認してください。将来的に App Attest ネイティブ連携が必要な場合は `@capacitor-firebase/app-check` の導入を検討します。

## セキュリティルール・Functions と同時デプロイ

```bash
firebase deploy --only firestore:rules,functions
npm run build
firebase deploy --only hosting
```

App Check を強制した直後にクライアントが古いビルドのままだと API が拒否されるため、Hosting / TestFlight の更新タイミングに注意してください。
