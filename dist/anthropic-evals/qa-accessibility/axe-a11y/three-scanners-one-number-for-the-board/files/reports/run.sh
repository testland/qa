#!/usr/bin/env bash
set -euo pipefail

URL=https://staging.northwind.example/checkout

npx @axe-core/cli "$URL" \
  --tags wcag2a,wcag2aa \
  --save reports/axe-checkout.json

npx pa11y "$URL" \
  --standard WCAG2AA \
  --runner htmlcs \
  --include-warnings \
  --include-notices \
  --reporter json > reports/pa11y-checkout.json

curl -sS "https://wave.webaim.org/api/request?key=$WAVE_API_KEY&url=$URL&reporttype=4" \
  > reports/wave-checkout.json
