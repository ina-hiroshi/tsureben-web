#!/usr/bin/env bash
# public/logo.png を iOS App Store アイコン (1024 RGB) に同期する
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/public/logo.png"
OUT="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: $SRC がありません" >&2
  exit 1
fi

export SRC OUT
python3 - <<'PY'
from PIL import Image
import os
src = os.environ["SRC"]
out = os.environ["OUT"]
img = Image.open(src)
if img.size != (1024, 1024):
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img.convert("RGB").save(out, "PNG", optimize=True)
print(f"OK: {src} -> {out}")
PY

xattr -c "$OUT" 2>/dev/null || true
echo "完了: Xcode でアーカイブする前にこのスクリプトを実行してください。"
