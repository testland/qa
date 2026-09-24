#!/usr/bin/env bash
# Compares this branch's spec against the one on the developer portal.
set -euo pipefail

PORTAL_SPEC="https://developer.northwind-webhooks.example/specs/latest/openapi.yaml"
BRANCH_SPEC="https://raw.githubusercontent.com/acme/webhooks-api/release-3.2.0/spec/openapi.yaml"

docker run --rm -t tufin/oasdiff breaking \
  --fail-on ERR \
  --format text \
  "$PORTAL_SPEC" \
  "$BRANCH_SPEC"
