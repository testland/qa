---
name: reachability-analyzer
description: "Runs dead-dependency analysis across JS, Python, and Rust projects
  using ecosystem-native static tools (`depcheck`/`knip` for JS, `vulture` for
  Python, `cargo-machete` for Rust), then cross-references the unused-dependency
  list against SCA findings to downrank vulns in code that is never loaded.
  Use when SCA output (from `osv-scanner`, `snyk-test`, or `npm-pip-maven-audit`)
  is too noisy to triage and the team needs to separate unreachable CVEs from
  exploitable ones before sprint planning; sibling cve-exploitability-triage ranks by EPSS/KEV exploitation signal, not code reachability."
metadata:
  keywords: "reachability, dead-dependencies, sca, depcheck, knip, vulture, cargo-machete, prioritization"
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

1. Run SCA first and save the findings JSON - this skill annotates existing
   findings, it does not replace them. See `osv-scanner` (or `snyk-test` /
   `npm-pip-maven-audit`) for full setup:

   ```bash
   osv-scanner scan -r . --format json --output osv.json
   ```

2. Run the ecosystem-native dead-dependency tool for your stack, then extract
   the unused names into `unused-deps.txt`. Full config, flags, exit codes, and
   suppression per tool:
   [references/dead-dependency-tools.md](references/dead-dependency-tools.md):

   ```bash
   # JS/TS - knip (preferred; depcheck was archived June 2025)
   npx knip --reporter json | jq -r '.dependencies[].name' > unused-deps.txt
   # Python - vulture; --min-confidence 90 targets unused imports
   vulture src/ --min-confidence 90 > vulture-report.txt
   # Rust - cargo-machete; --with-metadata catches renamed/feature-gated crates
   cargo machete 2>&1 | grep "unused dependency" | awk '{print $NF}' > unused-deps.txt
   ```

3. Keep production and dev unused-dep lists separate: dev deps with CVEs can
   still reach production in bundled builds.

4. Cross-reference `unused-deps.txt` against the SCA JSON, setting
   `reachable: false` on every finding whose package is unused (script below).

5. Verify: assert `unused-deps.txt` is non-empty and every finding in the
   annotated JSON carries a populated `reachable` field before handoff. If the
   file is empty or a finding lacks the field, re-run the dead-dependency tool
   (a silent tool failure or the wrong workspace root is the usual cause) and
   re-annotate before proceeding.

6. Pass the annotated JSON to your SCA prioritization step; `reachable: false`
   routes to Fix-Backlog unless the CVE is in the CISA KEV catalog.

7. Wire steps 2-4 into CI so the annotated artifact feeds the prioritization job
   on every run, and still schedule each unused package for cleanup.

## Cross-reference unused deps with SCA findings

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

## CI integration

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

## Worked example

A team's OSV scan of a Next.js service returns 60 CVEs - too many to patch in one
sprint. They run the JS dead-dependency tool (step 2), which flags 12 of the 80
declared dependencies as unused, including `moment` (CVE-2022-31129, CVSS 7.5). The cross-reference script sets
`reachable: false` on the moment finding because `moment` appears in
`unused-deps.txt`. Prioritization routes that CVE to Fix-Backlog instead of
Fix-This-Sprint, and the team removes `moment` in the next dependency-cleanup PR,
eliminating both the CVE and the unused weight in one change.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip reachability; sort SCA output by CVSS only | Teams spend sprints patching vulns in unused code while exploitable issues sit in Fix-Backlog | Run the cross-reference step before triage |
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

- [references/dead-dependency-tools.md](references/dead-dependency-tools.md) -
  per-ecosystem tool detail: knip/depcheck, vulture, cargo-machete config, flags,
  exit codes, suppression
- [github.com/webpro-nl/knip](https://github.com/webpro-nl/knip) - knip unused
  files/exports/dependencies detection
- [github.com/depcheck/depcheck](https://github.com/depcheck/depcheck) -
  depcheck CLI reference (archived June 2025; knip recommended for new setups)
- [github.com/jendrikseipp/vulture](https://github.com/jendrikseipp/vulture) -
  vulture CLI reference, confidence values, whitelist generation
- [github.com/bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete) -
  cargo-machete CLI reference, exit codes, Cargo.toml metadata
- `osv-scanner`,
  `snyk-test`,
  `npm-pip-maven-audit` - SCA tools whose
  output this skill annotates
