#!/usr/bin/env bash
# Release AAB を Gradle でビルドする（key.properties と keystore が必要）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build
npx cap sync android

if [[ ! -f android/key.properties ]]; then
  echo "Error: android/key.properties がありません。"
  echo "  cp android/key.properties.example android/key.properties"
  echo "  を実行し、keystore のパスとパスワードを設定してください。"
  exit 1
fi

cd android
./gradlew bundleRelease

echo ""
echo "AAB: android/app/build/outputs/bundle/release/app-release.aab"
