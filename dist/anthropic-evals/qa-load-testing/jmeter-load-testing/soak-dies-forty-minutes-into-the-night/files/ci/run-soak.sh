#!/usr/bin/env bash
set -euo pipefail

# Nightly search soak. Runs on the shared self-hosted agent (8 GB total).
# We take 3 GB of it; mobile and platform builds need the rest.
export JVM_ARGS="-Xms512m -Xmx3g"

WORKSPACE="${WORKSPACE:-/srv/agent/workspace/search-soak}"

# artifacts/soak-tree.jtl is the file the team downloads after a run.
# Do not remove the Results Writer element from the plan.
/opt/jmeter/bin/jmeter \
  -n -t "$WORKSPACE/plans/search-soak.jmx" \
  -l "$WORKSPACE/artifacts/soak.jtl" \
  -q "$WORKSPACE/bin/soak.properties" \
  -Japi.host=staging.search.example.com \
  -Jduration=5400

echo "soak finished"
