# DAST scan cadence - layered rollout planning

Companion reference for `zap-baseline`. Consult when a team adopts DAST from
scratch, restructures scan cadence, or is drowning in findings with no triage
discipline. Layers ZAP passive baseline and active scanning (ZAP full scan +
nuclei templates) across PR / nightly windows, with a baseline ratchet so
pre-existing findings do not block PRs.

## Step 1 - Layer the scans by intrusiveness

| Layer | Scan type | Cadence | Target | Risk |
|---|---|---|---|---|
| 1 | Passive baseline (ZAP baseline) | Per-PR (blocking) | Staging | Safe - passive only |
| 2 | Active scan (ZAP full scan + nuclei templates) | Nightly | Staging | Active probes - pollute staging data |

The PR-blocking layer is intentionally narrow - only fail on findings that
didn't exist before. That requires the baseline ratchet (Step 2). Nuclei
(`nuclei-dast` skill) complements the nightly ZAP full scan with
template-driven checks; its JSONL output feeds the same aggregation layer.

## Step 2 - Baseline-finding ratchet

The first scan against a legacy app surfaces 100s of pre-existing findings;
if they all block PRs, the team disables DAST. The ratchet pattern:

1. Run the scan once against current main → save as
   `baseline-findings.json`
2. Per-PR: run the scan, diff against baseline, fail only on NEW findings
3. Periodically (weekly): re-baseline, requiring waiver entries for any
   persisted findings

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

ZAP baseline natively supports per-rule gating via the `-c config.tsv` rule
file; mirror the pattern for the cross-tool aggregation layer.

## Step 3 - Alert deduplication across runs

Consecutive PR-runs catch the same vulnerability multiple times; each PR
comment shows duplicate noise. Dedupe by `(rule_id, url, parameter)` tuple:

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

Cross-tool dedup is handled at the aggregation layer (`security-finding-triager`);
this dedup is per-tool per-run.

## Step 4 - CI cadence

Two workflows implement the layering:

| Workflow file | Trigger | Job |
|---|---|---|
| `.github/workflows/dast.yml` | `pull_request` | ZAP baseline + `dast-pr-gate.py` (Step 2) |
| `.github/workflows/dast-nightly.yml` | `cron: 0 2 * * *` | ZAP full scan + nuclei template scan |

```yaml
# .github/workflows/dast.yml - PR-blocking baseline
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
# .github/workflows/dast-nightly.yml - nightly active scan
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
      - uses: actions/upload-artifact@v4
        with: { name: zap-full-report, path: report_html.html }

  nuclei:
    name: DAST template scan (nuclei)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          nuclei -u ${{ secrets.STAGING_URL }} -jsonl -o nuclei.jsonl
      - uses: actions/upload-artifact@v4
        with: { name: nuclei-report, path: nuclei.jsonl }
```

Nuclei flag details are in the `nuclei-dast` skill.

## Step 5 - Per-finding triage workflow

When a new finding appears in a PR-blocking scan, the team has 4 options:

1. **Fix** - code change resolves the finding
2. **Suppress with justification** - add to `.zap/rules.tsv`
   with `# Reason: ... Re-review-date: ...`
3. **Add to baseline** - explicit acceptance; finding tracked in baseline
   file with reviewer attribution
4. **Escalate** - beyond PR scope; create a tracker ticket + waive per-PR
   with explicit ticket reference

Each option requires reviewer + reason + Re-review-date in commit message or
PR comment. No silent suppression.

## Step 6 - Coverage measurement

Post-scan, measure coverage to detect blind spots:

```bash
# How many endpoints did the scan cover?
jq '.spider_results.urls | length' report.json
# How many endpoints did the OpenAPI spec define?
jq '.paths | length' openapi.yaml
# Coverage ratio
```

If coverage < 80% of API surface, the spider missed routes; investigate auth
flows ([auth.md](auth.md)), JS-heavy SPAs, route-discovery gaps.

## Step 7 - Aggregate cross-tool findings

Once both tools run, aggregate each tool's output:

```bash
zap-baseline.py -t $URL -J zap.json
nuclei -u $URL -jsonl -o nuclei.jsonl

# Aggregate both + emit unified verdict
```

The aggregation layer (the `security-finding-triager` agent +
`multi-tool-finding-triage`) handles cross-tool dedup, severity
normalization, and waiver enforcement.

## Anti-patterns specific to DAST cadence

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run full active scans on every PR | Scan time blows out CI; staging data corrupted | Baseline-only on PR; full nightly (Step 4) |
| Skip baseline ratchet | Legacy findings block every PR | Baseline + diff (Step 2) |
| Ignore coverage measurement | Missing endpoints unscanned silently | Step 6 weekly check |
| One scan per app, never re-baseline | Baseline grows stale; misses regressions in old code | Quarterly re-baseline + waiver review |
| Run ZAP + nuclei without dedup | Same finding shows twice | Aggregate via triager (Step 7) |

## End-to-end cadence checklist

1. ZAP baseline runs PR-blocking against staging (Step 4)
2. ZAP full scan + nuclei run nightly against staging (Step 4)
3. Baseline ratchet active for legacy apps (Step 2)
4. Per-tool dedup applied (Step 3)
5. Cross-tool dedup via triager (Step 7)
6. Coverage measured weekly (Step 6)
7. Suppression entries have `Re-review-date` + reviewer (Step 5)

## Limitations

- Active scans are inherently destructive on staging data; pair with a
  staging-data refresh cadence.
- DAST coverage is bounded by spider + spec discovery; SPA-heavy apps need
  careful auth + route-discovery setup ([auth.md](auth.md)).
- The cadence assumes overnight windows; high-velocity shops may need
  shorter cycles + smaller scan scopes.

## Sources

- OWASP WSTG - owasp.org/www-project-web-security-testing-guide
- OWASP DSOMM (DevSecOps Maturity Model) for cadence guidance
- `nuclei-dast` - nuclei flags + CI integration
