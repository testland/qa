#!/bin/sh
set -e

npm ci
npm test

# locale bundles are generated into the image, not committed
node scripts/build-locales.js

docker build -t registry.internal/notifier:"$GIT_SHA" .
docker push registry.internal/notifier:"$GIT_SHA"
