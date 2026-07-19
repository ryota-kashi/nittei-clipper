#!/bin/bash
# ストア提出用ZIPを dist/ に作成する
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('src/manifest.json'))['version'])")
OUT="dist/nittei-clipper-v${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
(cd src && zip -r "../$OUT" . -x '.*' -x '__MACOSX*')

echo "作成完了: $OUT"
