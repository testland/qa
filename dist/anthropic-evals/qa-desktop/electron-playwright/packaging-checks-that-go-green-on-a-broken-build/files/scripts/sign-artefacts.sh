#!/usr/bin/env bash
set -euo pipefail

case "$RUNNER_OS" in
  macOS)   ARTEFACT="dist/mac-arm64/Ledgerline.app/Contents/MacOS/Ledgerline" ;;
  Windows) ARTEFACT="dist/win-unpacked/Ledgerline.exe" ;;
  Linux)   ARTEFACT="dist/linux-unpacked/ledgerline" ;;
  *)       echo "unknown runner image: $RUNNER_OS" >&2; exit 1 ;;
esac

if [ ! -e "$ARTEFACT" ]; then
  echo "no artefact at $ARTEFACT" >&2
  exit 1
fi

npm run sign -- "$ARTEFACT"
