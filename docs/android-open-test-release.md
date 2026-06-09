# Android オープンテスト公開ガイド（連れ勉 / TsureBen）

Capacitor Android 版を Google Play **オープンテスト**として配布する手順です。

## 1. Google Play 開発者登録（$25）

1. [Google Play Console](https://play.google.com/console) にアクセス
2. Google アカウントでログイン → **個人アカウント** を選択
3. 登録料 **$25（1回のみ）** を支払い
4. 開発者プロフィール（表示名・連絡先メール・電話番号）を入力
5. 本人確認（身分証アップロード等）→ 完了まで数時間〜数日

## 2. Firebase / Google ログイン（Android）

1. [Firebase Console](https://console.firebase.google.com) → プロジェクト `tsureben`
2. **アプリを追加** → Android
   - パッケージ名: `com.tsureben.app`（完全一致）
3. `google-services.json` をダウンロード → `android/app/google-services.json` に配置
4. [Google Cloud Console](https://console.cloud.google.com) → API とサービス → 認証情報
   - **OAuth 2.0 クライアント ID** を追加（種類: Android）
   - パッケージ名 `com.tsureben.app` + SHA-1（下記 keystore から取得）
5. Firebase Authentication → Google プロバイダが有効であることを確認
6. （任意）Google Cloud で作成した Android OAuth クライアント ID を [capacitor.config.json](../capacitor.config.json) の `plugins.GoogleAuth.androidClientId` に追加

```json
"androidClientId": "YOUR_ANDROID_OAUTH_CLIENT_ID.apps.googleusercontent.com"
```

`google-services.json` と `serverClientId` が正しければ、未設定でも動作する場合があります。

### SHA-1 の登録（2種類）

| 鍵 | 取得方法 | 登録先 |
|---|---|---|
| アップロード鍵 | `cd android && ./gradlew signingReport` | Firebase / Google Cloud |
| Play アプリ署名鍵 | Play Console → アプリの完全性 → アプリ署名 | Firebase / Google Cloud（初回 .aab アップロード後） |

> Play 経由配布では Google が再署名するため、**Play 側の SHA-1 を登録しないと Google ログインが失敗**します。

## 3. AdMob（Android）

1. [AdMob Console](https://apps.admob.com) で Android アプリを追加（`com.tsureben.app`）
2. アプリ ID・バナー広告ユニット ID を取得
3. ビルド時に環境変数を設定（または `.env`）:

```bash
VITE_ADMOB_ANDROID_BANNER_ID=ca-app-pub-xxxxxxxx/yyyyyyyy
```

オープンテスト初期はテスト広告推奨:

```bash
VITE_ADMOB_FORCE_TEST=true npm run build
```

`android/app/src/main/AndroidManifest.xml` の `com.google.android.gms.ads.APPLICATION_ID` に AdMob アプリ ID を設定済み（テスト ID がデフォルト。本番 ID は `AndroidManifest.xml` を更新）。

## 4. 署名鍵（keystore）の作成

```bash
keytool -genkey -v -keystore tsureben-release.keystore \
  -alias tsureben -keyalg RSA -keysize 2048 -validity 10000
```

- keystore とパスワードは **安全にバックアップ**（紛失 = 更新不可）
- Git にコミットしない

`android/key.properties.example` を `android/key.properties` にコピーし、値を入力:

```properties
storeFile=../tsureben-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=tsureben
keyPassword=YOUR_KEY_PASSWORD
```

## 5. .aab ビルド

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

出力: `android/app/build/outputs/bundle/release/app-release.aab`

または Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**

## 6. Play Console オープンテスト公開

### アプリ作成
- アプリ名: 連れ勉（TsureBen）
- 言語: 日本語 / 無料

### ストア掲載情報（最低限）
- 短い説明 / 詳細説明
- アイコン 512×512（`public/logo.png` を使用可）
- スマホスクリーンショット 2枚以上
- プライバシーポリシー: `https://tsureben.web.app/privacy`

### ポリシーフォーム
- **アプリのアクセス権**: ログイン必要 → 審査用アカウントを記載（`npm run create-review-account`）
- **広告**: はい
- **コンテンツのレーティング** / **ターゲット層** / **データセーフティ** を回答

### オープンテスト
1. **テスト → オープンテスト** で `.aab` をアップロード
2. 審査通過後、参加リンクを取得:
   `https://play.google.com/apps/testing/com.tsureben.app`
3. 学校向け案内・QR コードで配布

## 7. 動作確認チェックリスト

- [ ] Google ログイン（教員）
- [ ] メール登録 / ログイン（生徒）
- [ ] Apple ログインボタンが Android で表示されない
- [ ] 学校配布アカウントで広告非表示
- [ ] 自己登録生徒で広告表示
- [ ] QR コード読み取り（仲間招待）

## 開発コマンド

```bash
npm run build:android   # Web ビルド + cap sync android
npx cap open android    # Android Studio で開く
```
