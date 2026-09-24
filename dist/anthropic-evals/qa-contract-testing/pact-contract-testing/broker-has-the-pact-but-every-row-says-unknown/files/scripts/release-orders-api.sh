#!/usr/bin/env bash
set -euo pipefail

VERSION="$(node -p "require('./services/orders-api/package.json').version")"

echo "releasing orders-api ${VERSION}"
kubectl set image deploy/orders-api api="registry.internal/orders-api:${VERSION}"
kubectl rollout status deploy/orders-api --timeout=5m
./scripts/smoke.sh https://orders.internal

pact-broker record-deployment \
  --pacticipant orders-api \
  --version "${VERSION}" \
  --environment production
