#!/usr/bin/env bash
set -euo pipefail
schemathesis run http://localhost:8000/openapi.json \
  --base-url http://localhost:8000/api \
  --checks all \
  --hypothesis-max-examples 50 \
  --hypothesis-seed 1234 \
  --request-timeout 5000 \
  --stateful=links \
  --junit-xml reports/schemathesis.xml \
  --exitfirst
