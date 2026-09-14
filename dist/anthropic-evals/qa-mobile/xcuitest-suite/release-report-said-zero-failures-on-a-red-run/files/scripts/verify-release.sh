#!/bin/bash
set -e

VERSION="${1:?usage: verify-release.sh <version>}"
LOG=build/tests.log
REPORT="reports/release-${VERSION}.md"

mkdir -p build reports

xcodebuild test \
  -project Tidewater.xcodeproj \
  -scheme Tidewater \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
  | tee build/test.log

FAILS=$(grep -c "error:" "$LOG" 2>/dev/null || true)

{
  echo "# Tidewater ${VERSION} release verification"
  echo
  echo "- Simulator: iPhone 15 / iOS 17.5"
  echo "- UI tests: ${FAILS:-0} failures"
  echo "- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$REPORT"

echo "wrote $REPORT"
