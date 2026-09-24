#!/usr/bin/env bash
set -euo pipefail

VERSION="$(git describe --tags --abbrev=0)"

echo "releasing notifications-worker ${VERSION}"
kubectl set image deploy/notifications-worker worker="registry.internal/notifications-worker:${VERSION}"
kubectl rollout status deploy/notifications-worker --timeout=5m

pact-broker record-deployment \
  --pacticipant notifications-worker \
  --version "${VERSION}" \
  --environment production
