#!/usr/bin/env bash
# Nightly full-history secret scan. Cron: 02:15 UTC, runner box ci-03.
set -euo pipefail

STAMP="$(date -u +%Y-%m-%d)"
mkdir -p .secrets

gitleaks detect --source . -v \
  --config .gitleaks.toml \
  --report-format json \
  --report-path ".secrets/scan-${STAMP}.json"

echo "report written to .secrets/scan-${STAMP}.json"
