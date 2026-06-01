#!/usr/bin/env bash
#
# TsureBen iOS 完全自動ビルド & App Store Connect (TestFlight) アップロード
#
# これ1コマンドで: Web ビルド -> Capacitor 同期 -> アーカイブ -> IPA 書き出し
#                 -> TestFlight アップロード までを自動実行する。
# 署名は App Store Connect API キーで自動取得するため、Xcode での手動操作は不要。
#
# 事前準備（初回のみ）:
#   1. App Store Connect API キーを取得し ios/.appstore.env を作成
#        cp ios/.appstore.env.example ios/.appstore.env  # 値を編集
#   2. .p8 を ~/.appstoreconnect/private_keys/ に配置
#   3. App Store Connect 側で対象 App レコード（Bundle ID: com.tsureben.app）を作成済みにする
#   4. Xcode に iOS プラットフォームが入っていること
#        未インストールなら: xcodebuild -downloadPlatform iOS
#
# 使い方:
#   ./ios/archive-upload.sh
#   ./ios/archive-upload.sh 1.0.1          # マーケティングバージョンを指定（任意）
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios/App"
BUILD_DIR="$ROOT_DIR/ios/App/output"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
EXPORT_OPTIONS="$ROOT_DIR/ios/ExportOptions.plist"
ENV_FILE="$ROOT_DIR/ios/.appstore.env"

# --- 認証情報の読み込み ---------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE がありません。ios/.appstore.env.example を元に作成してください。" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
: "${ASC_KEY_ID:?ASC_KEY_ID 未設定}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID 未設定}"
: "${ASC_KEY_PATH:?ASC_KEY_PATH 未設定}"
ASC_KEY_PATH="${ASC_KEY_PATH/#\~/$HOME}"
if [[ ! -f "$ASC_KEY_PATH" ]]; then
  echo "ERROR: API キーが見つかりません: $ASC_KEY_PATH" >&2
  exit 1
fi

# バージョン/ビルド番号
MARKETING_VERSION="${1:-}"
BUILD_NUMBER="$(date +%Y%m%d%H%M)"   # 一意なビルド番号（重複アップロード回避）

AUTH_ARGS=(
  -allowProvisioningUpdates
  -authenticationKeyPath "$ASC_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
)

# --- プラットフォーム確認 -------------------------------------------------
if ! xcodebuild -showsdks 2>/dev/null | grep -qi "iphoneos"; then
  echo "ERROR: iOS プラットフォームが未インストールです。次を実行してください:" >&2
  echo "  xcodebuild -downloadPlatform iOS" >&2
  exit 1
fi

echo "==> 1/5 アプリアイコン同期 (public/logo.png)"
if [[ -x "$ROOT_DIR/ios/scripts/sync-app-icon.sh" ]]; then
  "$ROOT_DIR/ios/scripts/sync-app-icon.sh"
else
  echo "WARN: ios/scripts/sync-app-icon.sh がありません。AppIcon を手動確認してください。" >&2
fi

echo "==> 2/5 Web ビルド & Capacitor 同期"
cd "$ROOT_DIR"
npm run build
npx cap sync ios

echo "==> 3/5 アーカイブ作成 (build $BUILD_NUMBER)"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
VERSION_OVERRIDE=(CURRENT_PROJECT_VERSION="$BUILD_NUMBER")
[[ -n "$MARKETING_VERSION" ]] && VERSION_OVERRIDE+=(MARKETING_VERSION="$MARKETING_VERSION")
xcodebuild -workspace "$IOS_DIR/App.xcworkspace" \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  "${AUTH_ARGS[@]}" \
  "${VERSION_OVERRIDE[@]}" \
  archive

echo "==> 4/5 IPA 書き出し"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$EXPORT_PATH" \
  "${AUTH_ARGS[@]}"

echo "==> 5/5 App Store Connect へアップロード"
IPA_PATH="$(ls "$EXPORT_PATH"/*.ipa | head -n1)"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo ""
echo "完了: TestFlight に表示されるまで数分〜数十分かかります。"
echo "  https://appstoreconnect.apple.com/teams/${TEAM_ID:-}/apps"
