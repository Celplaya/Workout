#!/bin/sh
# Installs (or upgrades) the PocketBase binary into $APP_DIR/bin, verified by checksum.
# Usage: APP_DIR=/mnt/Opslag/apps/workout PB_VERSION=0.40.4 sh deploy/install-pocketbase.sh
set -eu

: "${APP_DIR:?APP_DIR is niet gezet}"
: "${PB_VERSION:?PB_VERSION is niet gezet}"

BIN="$APP_DIR/bin/pocketbase"
if [ -x "$BIN" ] && "$BIN" --version 2>/dev/null | grep -q "$PB_VERSION"; then
  echo "PocketBase $PB_VERSION is al geïnstalleerd."
  exit 0
fi

case "$(uname -m)" in
  x86_64 | amd64) ARCH=amd64 ;;
  aarch64 | arm64) ARCH=arm64 ;;
  *) echo "Onbekende architectuur: $(uname -m)" >&2; exit 1 ;;
esac

ZIP="pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
BASE="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "PocketBase $PB_VERSION ($ARCH) downloaden…"
curl -fsSL -o "$TMP/$ZIP" "$BASE/$ZIP"
curl -fsSL -o "$TMP/checksums.txt" "$BASE/checksums.txt"
(cd "$TMP" && grep " $ZIP\$" checksums.txt | sha256sum -c -)

if command -v unzip >/dev/null 2>&1; then
  unzip -q -o "$TMP/$ZIP" pocketbase -d "$TMP/out"
else
  python3 -c "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extract('pocketbase', sys.argv[2])" "$TMP/$ZIP" "$TMP/out"
fi

mkdir -p "$APP_DIR/bin"
chmod +x "$TMP/out/pocketbase"
mv -f "$TMP/out/pocketbase" "$BIN"
"$BIN" --version
