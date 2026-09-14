#!/bin/bash
# copied from the iPad repo 2026-08-01 and pointed at the desktop scheme
set -e

xcodebuild test \
  -project Ledgerwood.xcodeproj \
  -scheme Ledgerwood \
  -destination 'platform=iOS Simulator,name=iPad Pro (11-inch),OS=latest' \
  -resultBundlePath build/result.xcresult
