# App Store 審査用チェックリスト（連れ勉 / TsureBen）

## 審査前のデプロイ

1. Cloud Functions をデプロイ（`deleteSelfRegisteredAccount` / `registerAppleStudent` を含む）

   ```bash
   firebase deploy --only functions:deleteSelfRegisteredAccount,functions:registerAppleStudent
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

## Web 版と iOS アプリの利用区分

| ユーザー | Web | iOS アプリ |
|----------|-----|-----------|
| 自己登録生徒 | 利用不可（ログイン・新規登録不可） | 利用可（メール登録 / **Apple ID 登録**、広告あり） |
| 学校配布生徒 | 利用可（メール + パスワード） | 利用可（広告なし） |
| 教員 | 利用可（Google ログイン） | 利用可（Google ログイン） |

自己登録生徒が Web にログインしようとした場合は拒否され、App Store への案内が表示されます。

### 手順 A: 審査員に新規登録してもらう（iOS アプリ）

1. **iOS アプリ**を起動 → 生徒ログイン欄で「新規登録（認証コード必要）」**または**「Apple で登録 / ログイン」
2. 審査用メール（例: `appreview+apple@example.com`）とパスワード（6文字以上）を入力（メール登録の場合）
3. 届いた認証コードを入力して登録完了（メール登録の場合）
4. ホーム → 学習計画・タイマー・連れ勉（カメラは QR 読取のみ）を確認
5. **設定 → アカウント削除** でアカウントを完全削除できることを確認

**Apple ID 登録の場合:** Firebase Console で Authentication → Apple プロバイダを有効化し、Apple Developer で Sign in with Apple を設定してから TestFlight ビルドで確認してください。削除は設定画面から Apple 再認証で行えます。

### 手順 B: 事前作成アカウントを審査メモに記載

`npm run create-review-account` 実行後に表示されるメール・パスワードを Connect に貼る。

- `registrationType: self_registered` であること（学校配布アカウントは削除 UI なし）
- 設定 → **アカウント削除** で削除できることを審査メモに明記

## App Store Connect「審査メモ」文案（例）

```
【生徒アカウント（iOS アプリ）】
- メールアドレスとパスワードで新規登録できます（認証コード付き）。
- Apple ID でも新規登録・ログインできます。
- 自己登録アカウントは「設定」→「アカウント削除」からアプリ内で完全に削除できます（Apple 登録の場合は Apple 再認証）。
- 学校から配布されたアカウントは削除できません（学校管理者が対応）。

【Web 版】
- 教員（Google ログイン）と学校配布生徒（メール + パスワード）のみ利用できます。
- 自己登録生徒は Web ではログイン・登録できません。iOS アプリをご利用ください。

【教員アカウント】
- 学校が事前登録した Google アカウントでのみログインします（生徒向けの自己登録ではありません）。

【カメラ】
- 連れ勉の招待 QR コード読み取りのみ使用します。写真・動画の保存はしません。

【広告（AdMob）】
- 自己登録（メール認証）の生徒アカウントのみ、iOS アプリのホーム・学習計画・学習記録・連れ勉画面下部にバナー広告を表示します。
- 学校配布アカウント・教員・学習タイマー画面・Web 版では広告は表示しません。
- 児童向けの非パーソナライズ広告（COPPA 対応）です。

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
| 広告 ID | はい（自己登録・iOS のみ） | 広告配信（非パーソナライズ） | Google AdMob |

## リジェクト時のエスカレーション

| 指摘内容 | 対応 |
|----------|------|
| アカウント削除がない | 設定画面の「アカウント削除」を案内（本実装済み） |
| プライバシーポリシー | `/privacy` の URL を Connect に登録 |
| Sign in with Apple（教員 Google ログイン） | 教員は Google のみ。生徒は iOS で Apple ID 登録を提供。審査メモで Web/アプリの役割分担を説明 |
| デモデータが見えない | 審査用実アカウントをメモに記載。スクリーンショット撮影時は super_admin が管理画面のデモデータを ON にできる（下記） |

## 学校管理者による教員コメント閲覧

`school_admin` / `super_admin` は **管理** → **教員コメント履歴**（`/admin/teacher-comments`）から、本校の教員コメントと生徒の返信を閲覧できます。削除したコメントもソフト削除として履歴に残ります（実装以前の物理削除分を除く）。審査メモで「指導目的の利用監視」と説明可能です。

## App Store スクリーンショット用デモデータ（super_admin のみ）

本番ビルドでも **super_admin** がログイン中のみ、管理画面から架空の UI データを表示できます。一般ユーザーには表示されません。

1. super_admin アカウントで Google ログイン
2. **管理** → **デモデータ** → 撮影したい画面に対応する機能を ON（初回はすべて OFF）
3. 教員画面を撮る場合は、サイドバーの **学校を切替** で学校を選択
4. 撮影後は **すべて OFF** を推奨（同一端末で他アカウントに漏れないよう、ログアウトでも自動 OFF）

| トグル | 用途 |
|--------|------|
| 生徒確認 | 教員の生徒確認（120名のデモ生徒・計画・記録・フィードバック） |
| 教員コメント履歴 | 管理画面の教員コメント履歴（デモの教員コメント・生徒返信・削除済みサンプル） |
| 連れ勉 | 連れ勉ページ（相互・申請中・受信待ち） |
| 一緒に勉強中 | ホーム・学習タイマーの presence グリッド |
| 学習計画・記録 | ログイン中ユーザーの計画・記録・週/月集計 |

## 動作確認チェックリスト

- [ ] 自己登録 → ログイン → 設定に「アカウント削除」が表示される
- [ ] 削除後、同じメールで再ログインできない
- [ ] 学校配布アカウントでは削除 UI が非表示（または管理者案内のみ）
- [ ] 教員 Google ログインでは削除 UI が非表示
- [ ] `/privacy` がブラウザ・WebView で開ける
- [ ] iOS 実機で Callable（アカウント削除）が成功する
