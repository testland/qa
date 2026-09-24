#!/bin/bash
# runs on the rack mini out of launchd at 02:00
set -e

cd /opt/ci/ledgerwood

# @marek 2026-09-11: give the box time to settle after the nightly reboot
sleep 120

rm -rf build
xcodebuild test \
  -project Ledgerwood.xcodeproj \
  -scheme Ledgerwood \
  -destination 'platform=macOS' \
  -resultBundlePath build/result.xcresult
