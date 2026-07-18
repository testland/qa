---
name: reachability-analyzer
description: "Runs dead-dependency analysis across JS, Python, and Rust projects
  using ecosystem-native static tools (`depcheck`/`knip` for JS, `vulture` for
  Python, `cargo-machete` for Rust), then cross-references the unused-dependency
  list against SCA findings to downrank vulns in code that is never loaded.
  Use when SCA output (from `osv-scanner`, `snyk-test`, or `npm-pip-maven-audit`)
  is too noisy to triage and the team needs to separate unreachable CVEs from
  exploitable ones before sprint planning."
keywords:
  - reachability
  - dead-dependencies
  - sca
  - depcheck
  - knip
  - vulture
  - cargo-machete
  - prioritization
---

# reachability-analyzer

## Overview

Static vulnerability scanners report a CVE for every declared dependency that
matches a vulnerable version, regardless of whether the vulnerable code is ever
executed. A critical-severity finding in a test-only helper that your production
build tree never reaches is a different risk level than the same CVE in a
hot-path dependency. This skill operationalizes a reachability heuristic:
run an ecosystem-native dead-dependency tool, produce an `unused-deps.txt`
artifact, and feed that list into your SCA prioritization step so it can
assign `reachable: false` and route affected findings to Fix-Backlog instead
of Fix-Now.

The approach is static-analysis heuristic only. A dependency flagged unused by
these tools is a strong signal to deprioritize its CVEs, not a guarantee that
the vulnerable code is unreachable at runtime. Treat it accordingly.

## When to use

- After any SCA scan produces more findings than the team can triage in one
  sprint and you need a principled filter.
- Before feeding findings into SCA prioritization so the `reachable` field is
  populated.
- During dependency cleanup: the same tooling surfaces dead weight (unused
  packages that add attack surface and install time with no benefit).
- When a security reviewer asks "is this CVE in something we actually use?"

## How to use

### Step 1 - Run SCA first

Collect scanner output before running reachability analysis. The output of
this skill annotates existing findings; it does not replace them.

```bash
# Example: OSV-Scanner JSON output to feed SCA prioritization
osv-scanner scan -r . --format json --output osv.json
```

See [`osv-scanner`](../osv-scanner/SKILL.md) for full setup.

### Step 2 - JavaScript / TypeScript: knip (preferred) or depcheck

**knip** is the current recommended tool for unused-dependency detection in JS
projects. Per [github.com/webpro-nl/knip](https://github.com/webpro-nl/knip), it
detects unused files, exports, and dependencies including dev-only packages.

```bash
npx knip --reporter json > knip-report.json
# Extract unused dependency names for the cross-reference list
npx knip --reporter json | jq -r '.dependencies[].name' > unused-deps.txt
```

**depcheck** remains usable for existing setups. Per
[github.com/depcheck/depcheck](https://github.com/depcheck/depcheck), the
project was archived in June 2025; the maintainers recommend switching to knip
for new setups. For teams still on depcheck:

```bash
npx depcheck --json > depcheck-report.json
# Extract unused package names
jq -r '.dependencies[],.devDependencies[]' depcheck-report.json > unused-deps.txt
```

Per [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck), the
`--json` flag produces an object with `dependencies` (unused production deps)
and `devDependencies` (unused dev deps) as arrays of package-name strings.
Packages in `devDependencies` that never appear in the production dep tree are
prime candidates for `reachable: false` annotation on any CVEs they carry.

Suppress known false positives via `.depcheckrc`:

```yaml
# .depcheckrc
ignores: ["babel-register", "eslint-*"]
ignore-patterns: ["dist", "coverage"]
```

#### Scope narrowing: dev vs production

Dev dependencies in non-production scope are already excluded from many
scanners. Per [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck),
running `npm audit --omit=dev` skips devDependencies entirely. Always separate
production and dev unused-dep lists:

```bash
# Separate production unused from dev unused
jq -r '.dependencies[]' depcheck-report.json > unused-prod.txt
jq -r '.devDependencies[]' depcheck-report.json > unused-dev.txt
```

### Step 3 - Python: vulture

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
vulture detects unused imports, functions, classes, and variables through static
analysis. For dependency reachability, unused imports are the direct signal.

```bash
pip install vulture
vulture src/ --min-confidence 90 > vulture-report.txt
```

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
`--min-confidence 90` targets imports specifically (confidence 90% for unused
imports). Lower values include functions and variables, which is noisier for
the dep-CVE cross-reference task.

Extract the unused-import lines:

```bash
grep "unused import" vulture-report.txt | sed "s/:.*unused import '\(.*\)'.*/\1/" > unused-imports.txt
```

Map import names back to pip package names using `pip show` or a manually
maintained `import-to-package.txt` map, since Python import names often differ
from PyPI package names (e.g. `import PIL` comes from `Pillow`).

Configure via `pyproject.toml` per
[github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture):

```toml
[tool.vulture]
paths = ["src/"]
min_confidence = 90
exclude = ["tests/", "migrations/"]
ignore_names = ["celery_app", "urlpatterns"]
```

Suppress known false positives (e.g. plugin registrations, dynamic imports)
by generating a whitelist:

```bash
vulture src/ --make-whitelist > whitelist.py
# Then re-run including the whitelist
vulture src/ whitelist.py --min-confidence 90
```

Per [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture),
exit code `3` means dead code found; `0` means clean.

### Step 4 - Rust: cargo-machete

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
cargo-machete detects unused `[dependencies]` in `Cargo.toml` through fast
static analysis.

```bash
cargo install cargo-machete
cargo machete
```

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
exit code `0` means no unused dependencies found; exit code `1` means at least
one unused dependency was detected; exit code `2` signals a processing error.

For more accurate detection when crates use renamed or feature-gated imports,
use `--with-metadata`:

```bash
cargo machete --with-metadata
```

Per [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete),
`--with-metadata` calls `cargo metadata --all-features` to resolve final
dependency names, which catches renames that simple text search misses.

Suppress false positives (e.g. proc-macro crates loaded at compile time only)
via `Cargo.toml` metadata per
[github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete):

```toml
[package.metadata.cargo-machete]
ignored = ["prost", "openssl"]

[package.metadata.cargo-machete.renamed]
rustls-webpki = "webpki"
```

Capture the unused-dep list:

```bash
cargo machete 2>&1 | grep "unused dependency" | awk '{print $NF}' > unused-deps.txt
```

### Step 5 - Cross-reference unused deps with SCA findings

Once you have an `unused-deps.txt` for your ecosystem, annotate the SCA JSON
output before passing it to your SCA prioritization step:

```python
import json

with open("osv.json") as f:
    findings = json.load(f)

with open("unused-deps.txt") as f:
    unused = {line.strip() for line in f}

for finding in findings.get("results", []):
    pkg = finding.get("package", {}).get("name", "")
    finding["reachable"] = pkg not in unused

with open("osv-annotated.json", "w") as f:
    json.dump(findings, f, indent=2)
```

Pass `osv-annotated.json` to your SCA prioritization step. Per the priority
logic, findings with `reachable: false` route to Fix-Backlog regardless of
severity, unless they are in the CISA KEV catalog.

### Step 6 - CI integration

```yaml
jobs:
  reachability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: JS unused deps (knip)
        run: npx knip --reporter json | jq -r '.dependencies[].name' > unused-deps.txt
      - name: Annotate OSV output
        run: python3 ci/annotate-reachability.py osv.json unused-deps.txt
      - uses: actions/upload-artifact@v4
        with:
          name: osv-annotated
          path: osv-annotated.json
```

The annotated artifact is then consumed by the prioritization job.

## Example

Running knip on a Next.js project with 80 declared dependencies surfaces
12 as unused, including `moment` (which carries CVE-2022-31129, CVSS 7.5).
After cross-reference, prioritization routes the moment CVE to Fix-Backlog
instead of Fix-This-Sprint. The team removes the package in the next dependency
cleanup PR, eliminating both the CVE and the unused weight.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip reachability; sort SCA output by CVSS only | Teams spend sprints patching vulns in unused code while exploitable issues sit in Fix-Backlog | Run Step 5 cross-reference before triage |
| Treat `reachable: false` as safe | Static heuristic; dynamic imports and plugin systems can load code at runtime | Use as deprioritization signal only; still schedule Fix-Backlog cleanup |
| Run vulture at default confidence (60%) | Reports unused functions/variables alongside imports; noisy for CVE mapping | Use `--min-confidence 90` to target imports specifically |
| Use depcheck on new JS projects | Archived June 2025; per [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck), maintainers recommend knip | Switch to knip for new setups |
| Skip `--with-metadata` in Rust monorepos | Renamed crates not detected; false "used" verdicts | Always pass `--with-metadata` in CI |
| Ignore devDependencies entirely | Dev deps with CVEs can reach production in bundled builds | Separate prod/dev lists; confirm `--omit=dev` in audit scope |

## Limitations

- All three tools use static analysis only. Dynamic imports (`require(variable)`
  in JS, `importlib.import_module` in Python) and compile-time proc macros in
  Rust can defeat detection, producing false "unused" verdicts.
- Import-to-package mapping for Python requires manual maintenance when import
  names differ from PyPI package names.
- Monorepo setups may require per-workspace runs; a dependency unused in one
  package may be used in another.
- cargo-machete per
  [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete)
  is described as "fast yet imprecise" - the trade-off is speed over recall.
- These tools detect unused declarations; they do not trace call graphs to the
  vulnerable function within a used package. For function-level reachability,
  runtime instrumentation (e.g. Snyk's reachability analysis, CodeTF-based
  call-graph tools) is required.

## References

- [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck) -
  depcheck CLI reference (archived June 2025; knip recommended for new setups)
- [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture) -
  vulture CLI reference, confidence values, whitelist generation
- [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete) -
  cargo-machete CLI reference, exit codes, Cargo.toml metadata
- [`osv-scanner`](../osv-scanner/SKILL.md),
  [`snyk-test`](../snyk-test/SKILL.md),
  [`npm-pip-maven-audit`](../npm-pip-maven-audit/SKILL.md) - SCA tools whose
  output this skill annotates
