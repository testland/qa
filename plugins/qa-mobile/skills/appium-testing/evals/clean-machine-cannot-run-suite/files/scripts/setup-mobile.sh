#!/usr/bin/env bash
set -euo pipefail

echo "==> installing automation server"
npm install -g appium

echo "==> installing node dependencies"
npm ci

echo "==> android sdk"
if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ANDROID_HOME is not set; install Android Studio first" >&2
  exit 1
fi

echo "==> checking server"
appium --version

echo "==> done. start the server with: appium"
