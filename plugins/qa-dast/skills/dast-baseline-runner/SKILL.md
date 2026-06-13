---
name: dast-baseline-runner
description: "Designs an end-to-end DAST cadence for teams adopting dynamic scanning: ZAP passive baseline (PR-blocking) then ZAP full active scan (nightly on staging) then optional Burp Pro deep scan (per-release). Handles the baseline-finding ratchet for legacy apps so pre-existing findings do not immediately block PRs, plus per-tool per-run deduplication and CI workflow YAML. Use when the team is setting up DAST from scratch or restructuring scan cadence, not when tools are already running and you need to merge their output (see dast-finding-triager for cross-tool aggregation of existing independent runs)."
rating: 23
d6: 4
---

# dast-baseline-runner

## Overview

DAST tools alone don't make a coverage strategy. A team running
ZAP baseline once per PR catches 30% of what ZAP can find; running
ZAP full + Burp + NightVision together at the right cadence catches
~80%. This skill is a **build-an-X workflow** - the per-team
DAST cadence and aggregation strategy.

## When to use

- The team adopts DAST for the first time + needs an end-to-end
  rollout plan.
- DAST is in place but findings overwhelm the team (no triage
  cadence; everything is critical).
- A new app needs DAST coverage from day one with the
  baseline-ratchet pattern.
- Multiple DAST tools are configured + need coordinated cadence
  (vs running each independently).

## Step 1 - Layer the scans by intrusiveness

Three scan types stack:

| Layer | Scan type | Cadence | Target | Risk |
|---|---|---|---|---|
| 1 | Passive baseline (ZAP baseline) | Per-PR (blocking) | Staging | Safe - passive only |
| 2 | Active full scan (ZAP full / NightVision) | Nightly | Staging | Active probes - pollute staging data |
| 3 | Deep paid scan (Burp Pro / Enterprise) | Per-release / weekly | Staging | Active + extension-driven |

PR-blocking layer is intentionally narrow - only fail on findings
that didn't exist before. This requires baseline ratchet (Step 3).

## Step 2 - Baseline-finding ratchet

The first scan against a legacy app surfaces 100s of pre-existing
findings; if they all block PRs, the team disables DAST. The
ratchet pattern:

1. Run the scan once against current main → save as
   `baseline-findings.json`
2. Per-PR: run the scan, diff against baseline, fail only on NEW
   findings
3. Periodically (weekly): re-baseline, requiring waiver entries
   for any persisted findings

```python
# pr-gate.py
import json

def diff_findings(current, baseline):
    baseline_keys = {(f['file'], f['rule_id']) for f in baseline}
    new = [f for f in current if (f['file'], f['rule_id']) not in baseline_keys]
    return new

with open('current.json') as f:
    current = json.load(f)
with open('baseline.json') as f:
    baseline = json.load(f)

new_findings = diff_findings(current, baseline)
if any(f['severity'] in ['critical', 'high'] for f in new_findings):
    print(f"FAIL: {len(new_findings)} new finding(s) on PR; not in baseline")
    exit(1)
```

ZAP baseline natively supports this via the `-c config.tsv` rule
file; mirror the pattern for the cross-tool aggregation layer.

## Step 3 - Alert deduplication across runs

Consecutive PR-runs catch the same vulnerability multiple times;
each PR comment shows duplicate noise. Dedupe by `(rule_id, url,
parameter)` tuple:

```python
def dedupe_findings(findings):
    seen = set()
    deduped = []
    for f in findings:
        key = (f['rule_id'], f['url'], f.get('parameter', ''))
        if key not in seen:
            seen.add(key)
            deduped.append(f)
    return deduped
```

For [`dast-finding-triager`](../../agents/dast-finding-triager.md)
integration, the triager handles cross-tool dedup; this skill's
dedup is per-tool per-run.

## Step 4 - CI cadence

```yaml
# .github/workflows/dast.yml
on:
  pull_request:
    branches: [main]

jobs:
  zap-baseline-pr:
    name: DAST baseline (PR-blocking)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: zaproxy/action-baseline@v0.13.0
        with:
          target: ${{ secrets.STAGING_URL }}
          rules_file_name: '.zap/rules.tsv'
      - run: python ci/dast-pr-gate.py current.json .zap/baseline-findings.json
```

```yaml
# .github/workflows/dast-nightly.yml
on:
  schedule:
    - cron: '0 2 * * *'   # 2 AM daily
  workflow_dispatch:

jobs:
  zap-full-scan:
    name: DAST active full scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: zaproxy/action-full-scan@v0.13.0
        with:
          target: ${{ secrets.STAGING_URL }}
      - name: Upload report
        uses: actions/upload-artifact@v4
        with: { name: zap-full-report, path: report_html.html }

  nightvision:
    name: DAST API spec scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: ./ci/run-nightvision.sh
```

```yaml
# .github/workflows/dast-release.yml
on:
  release:
    types: [created]
  workflow_dispatch:

jobs:
  burp-deep:
    name: Burp deep scan (per-release)
    runs-on: self-hosted    # Burp Enterprise lives on internal infra
    steps:
      - run: ./ci/burp-enterprise-trigger.sh
```

## Step 5 - Per-finding triage workflow

When a new finding appears in a PR-blocking scan, the team has
4 options:

1. **Fix** - code change resolves the finding
2. **Suppress with justification** - add to `.zap/rules.tsv`
   with `# Reason: ... Re-review-date: ...`
3. **Add to baseline** - explicit acceptance; finding tracked
   in baseline file with reviewer attribution
4. **Escalate** - beyond PR scope; create JIRA ticket + waive
   per-PR with explicit JIRA reference

Each option requires reviewer + reason + Re-review-date in commit
message or PR comment. No silent suppression.

## Step 6 - Coverage measurement

Post-scan, measure coverage to detect blind spots:

```bash
# How many endpoints did the scan cover?
jq '.spider_results.urls | length' report.json
# How many endpoints did the OpenAPI spec define?
jq '.paths | length' openapi.yaml
# Coverage ratio
```

If coverage < 80% of API surface, the spider missed routes; investigate
auth flows, JS-heavy SPAs, route-discovery gaps.

## Step 7 - Aggregate via [`dast-finding-triager`](../../agents/dast-finding-triager.md)

Once 2+ tools run, ingest each tool's JSON output into the triager:

```bash
zap-baseline.py -t $URL -J zap.json
nightvision scan results $SCAN_ID --output json > nightvision.json
# Burp Enterprise: download via API
curl ... -o burp.json

# Agent consumes all three + emits unified verdict
```

The agent handles cross-tool dedup, severity normalization, waiver
enforcement.

## Step 8 - Anti-patterns specific to DAST cadence

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run full active scans on every PR | Scan time blows out CI; staging data corrupted | Baseline-only on PR; full nightly (Step 4) |
| Skip baseline ratchet | Legacy findings block every PR | Baseline + diff (Step 2) |
| Ignore coverage measurement | Missing endpoints unscanned silently | Step 6 weekly check |
| One scan per app, never re-baseline | Baseline grows stale; misses regressions in old code | Quarterly re-baseline + waiver review |
| Run ZAP + Burp + NightVision without dedup | Same finding shows 3x | Aggregate via triager (Step 7) |

## Step 9 - End-to-end test recipe

For each app's DAST coverage:

1. ✅ ZAP baseline runs PR-blocking against staging (Step 4)
2. ✅ ZAP full scan runs nightly against staging (Step 4)
3. ✅ Per-release deep scan with paid tool (Burp Pro / Enterprise)
4. ✅ Baseline ratchet active for legacy apps (Step 2)
5. ✅ Per-tool dedup applied (Step 3)
6. ✅ Cross-tool dedup via triager (Step 7)
7. ✅ Coverage measured weekly (Step 6)
8. ✅ Suppression entries have `Re-review-date` + reviewer (Step 5)

## Limitations

- This is a build-an-X workflow. Tests use specific DAST tools
  per [`zap-baseline`](../zap-baseline/SKILL.md), [`burp-headless`](../burp-headless/SKILL.md),
  [`nightvision-dast`](../nightvision-dast/SKILL.md).
- Active scans are inherently destructive on staging data; pair
  with staging-data refresh cadence.
- DAST coverage is bounded by spider + spec discovery; SPA-heavy
  apps need careful auth + route-discovery setup.
- The cadence assumes overnight + per-release windows; high-velocity
  shops may need shorter cycles + smaller scan scopes.

## References

- [`zap-baseline`](../zap-baseline/SKILL.md),
  [`burp-headless`](../burp-headless/SKILL.md),
  [`nightvision-dast`](../nightvision-dast/SKILL.md) - sister tools
- [`dast-finding-triager`](../../agents/dast-finding-triager.md) - 
  cross-tool unifier
- OWASP WSTG - owasp.org/www-project-web-security-testing-guide
- OWASP DSOMM (DevSecOps Maturity Model) for cadence guidance
