#!/usr/bin/env bash
# Load test for one directory pack: installs the whole pack and checks that
# each case's prompt makes Claude load the expected skill (see packs/README.md).
# Usage: scripts/packs-eval.sh <pack-name> [runs]   e.g. testland-api 3
# Runs as you with your Claude credential; each run costs about $0.10.
set -euo pipefail
pack="${1:?usage: scripts/packs-eval.sh <pack-name> [runs]}"
runs="${2:-3}"
root="$(cd "$(dirname "$0")/.." && pwd)"
[ -d "$root/packs/evals/$pack" ] || { echo "no cases in packs/evals/$pack" >&2; exit 1; }
npm --prefix "$root" run --silent packs
rm -rf "$root/build/packs/$pack/evals"
cp -r "$root/packs/evals/$pack" "$root/build/packs/$pack/evals"
cd "$root/build/packs/$pack"
claude plugin eval . --ablation none --runs "$runs" --trust-plugin --no-publish -j 4
