# App Store 審査用チェックリスト（連れ勉 / TsureBen）

## 審査前のデプロイ

1. Cloud Functions をデプロイ（`deleteSelfRegisteredAccount` を含む）

   ```bash
   firebase deploy --only functions:deleteSelfRegisteredAccount
   ```

   または `firebase deploy --only functions`

2. Web をビルド・Hosting 反映（プライバシーポリシー `/privacy` を含む）

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

3. iOS: `./ios/archive-upload.sh` で TestFlight にアップロード

### アプリアイコン

元画像は **`public/logo.png`**（1024×1024）のみを使用します。アーカイブ前に次で iOS 用に同期できます。

```bash
./ios/scripts/sync-app-icon.sh
```

（`logo512.png` は PWA 用であり、App Store アイコンには使いません。）

### ITMS-91061（プライバシーマニフェスト）対応

Google Sign-In 関連 SDK は **GoogleSignIn 7.1+** が必要です。`npm install` 時に `patch-package` が `@codetrix-studio/capacitor-google-auth` を自動パッチします。`ios/App/Podfile` の `pre_install` も同様に podspec を更新します。

## お問い合わせ先

- メール: **itoguchi.app@gmail.com**（LINE-auto / itoguchi 共通）
- アプリ内プライバシーポリシー（`/privacy`）にも同じアドレスを記載

## 審査用テストアカウントの用意

### スクリプトで事前作成（推奨）

Firebase 管理者権限（`firebase login` 済み）で次を実行すると、**自己登録相当**の生徒アカウントが Auth + Firestore に作成されます。

```bash
npm run create-review-account
```

任意のメール・パスワード:

```bash
REVIEW_EMAIL=your-review@gmail.com REVIEW_PASSWORD='YourPass6+' npm run create-review-account
```

デフォルト（スクリプト未指定時）:

| 項目 | 値 |
|------|-----|
| メール | `tsureben.appstore.review@gmail.com` |
| パスワード | `TsureBenReview2026!` |

※ 実運用では審査専用 Gmail を用意し、`REVIEW_EMAIL` / `REVIEW_PASSWORD` で上書きすることを推奨します。

審査員向けに、**事前に Firebase 上で自己登録済み**のアカウントを用意するか、審査メモに「新規登録手順」を記載する。

### 手順 A: 審査員に新規登録してもらう

1. アプリを起動 → 生徒ログイン欄で「新規登録（認証コード必要）」
2. 審査用メール（例: `appreview+apple@example.com`）とパスワード（6文字以上）を入力
3. 届いた認証コードを入力して登録完了
4. ホーム → 学習計画・タイマー・連れ勉（カメラは QR 読取のみ）を確認
5. **設定 → アカウント削除** でアカウントを完全削除できることを確認

### 手順 B: 事前作成アカウントを審査メモに記載

`npm run create-review-account` 実行後に表示されるメール・パスワードを Connect に貼る。

- `registrationType: self_registered` であること（学校配布アカウントは削除 UI なし）
- 設定 → **アカウント削除** で削除できることを審査メモに明記

## App Store Connect「審査メモ」文案（例）

```
【生徒アカウント】
- メールアドレスとパスワードで新規登録できます（認証コード付き）。
- 自己登録アカウントは「設定」→「アカウント削除」からアプリ内で完全に削除できます。
- 学校から配布されたアカウントは削除できません（学校管理者が対応）。

【教員アカウント】
- 学校が事前登録した Google アカウントでのみログインします（生徒向けの自己登録ではありません）。

【カメラ】
- 連れ勉の招待 QR コード読み取りのみ使用します。写真・動画の保存はしません。

【テスト用ログイン】
メール: tsureben.appstore.review@gmail.com（または create-review-account で指定したアドレス）
パスワード: TsureBenReview2026!（スクリプト出力の値を使用）

【お問い合わせ】
itoguchi.app@gmail.com

プライバシーポリシー: https://tsureben.web.app/privacy
```

※ 本番 URL は Hosting の実 URL に置き換えること。

## App Privacy（栄養ラベル）対応表

| データ種別 | 収集 | 用途 | 第三者共有 |
|------------|------|------|------------|
| メールアドレス | はい | アカウント・認証 | Firebase（インフラ） |
| 氏名 / 表示名 | はい | アプリ内表示 | 同上 |
| 学習記録・計画 | はい | 学習支援機能 | 同上 |
| ユーザー ID | はい | 認証（Firebase UID） | 同上 |
| カメラ | はい（QR のみ、保存なし） | 連れ勉招待 | なし |
| 位置情報 | いいえ | — | — |
| 広告 ID | いいえ | — | — |

## リジェクト時のエスカレーション

| 指摘内容 | 対応 |
|----------|------|
| アカウント削除がない | 設定画面の「アカウント削除」を案内（本実装済み） |
| プライバシーポリシー | `/privacy` の URL を Connect に登録 |
| Sign in with Apple（教員 Google ログイン） | 審査メモで教員は学校事前登録と説明。再指摘時は教員向け Sign in with Apple を検討 |
| デモデータが見えない | 審査用実アカウントをメモに記載（本番ビルドに DEV デモは含まれない） |

## 動作確認チェックリスト

- [ ] 自己登録 → ログイン → 設定に「アカウント削除」が表示される
- [ ] 削除後、同じメールで再ログインできない
- [ ] 学校配布アカウントでは削除 UI が非表示（または管理者案内のみ）
- [ ] 教員 Google ログインでは削除 UI が非表示
- [ ] `/privacy` がブラウザ・WebView で開ける
- [ ] iOS 実機で Callable（アカウント削除）が成功する
