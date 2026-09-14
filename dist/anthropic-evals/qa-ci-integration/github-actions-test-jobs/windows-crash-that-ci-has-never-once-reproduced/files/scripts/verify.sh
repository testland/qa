#!/usr/bin/env bash
set -euo pipefail
test -f package.json
node -e "process.exit(process.version.startsWith('v') ? 0 : 1)"
echo "verify ok"
