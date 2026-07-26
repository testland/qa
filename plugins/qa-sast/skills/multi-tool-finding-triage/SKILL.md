---
name: multi-tool-finding-triage
description: "Merges two or more security scanner reports into one gate. Use when you need a single BLOCK or PASS decision from multiple scanners instead of reading N separate reports. Normalizes each report into one common finding format (a canonical `Finding`), deduplicates on a per-domain key while recording which scanners agree (`caught_by` consensus), validates a waiver (finding-suppression) file, rejecting any missing `expires:` / `approved_by:` / `reason:` or expired, enriches CVE findings with EPSS (exploit-probability) and CISA KEV (known-exploited catalog), then applies a `fail_on` severity threshold to emit BLOCK or PASS plus a bucketed pull-request comment. Works across static (SAST), dynamic (DAST), secret, dependency (SCA), container, and IaC scanners. To run a single scanner instead use semgrep-rules, codeql-queries, bandit-python, or gosec-go; this runs after them to merge output - the cross-scanner gate, not a single-scanner wrapper."
---

# multi-tool-finding-triage

## Overview

Several security scanners produce several reports, each with its own schema, its
own severity vocabulary, and its own idea of what counts as one finding.
Reviewers read N reports, miss that two tools flagged the same line, and
rubber-stamp the pull request. This is the tool-agnostic pipeline that turns N
reports into one decision:

```
collect -> normalize -> dedupe (+ consensus) -> enrich -> waive -> verdict -> report
```

**Differentiation axis.** Documentation for an individual scanner covers
installing it, writing its rules, and reading its native output. This is the
cross-scanner method that runs *after* those wrappers: schema normalization, the
dedupe key, waiver validation, and the gate. It owns no scanner-specific rule
syntax, no scanner config, and no scan invocation beyond collecting artifacts.

The method applies unchanged across six domains: static code analysis, dynamic
web scanning, secret detection, dependency CVE scanning, container image and SBOM
CVE scanning, and infrastructure policy scanning. Only the dedupe key (Step 3)
and the enrichment (Step 4) differ per domain.

## Step 1 - Collect scanner output

Accept **any subset** of the configured scanners. Never fabricate a data source
that did not run, and never silently skip a scanner whose output artifact is
present.

1. Discover artifacts in the workspace or CI download directory (the `*.json` and
   `*.sarif` reports each tool wrote).
2. Record which tools produced output and which did not, so the report
   distinguishes "clean" from "never ran".
3. If **no** artifact is found, halt with `NO_SCANNER_OUTPUT`: supply at least
   one scanner report.
4. If a tool is configured in the repository (config file present, or invoked in
   the pipeline definition) but produced no artifact, halt rather than pass.

## Step 2 - Normalize to the canonical Finding

Every report becomes a list of `Finding` records with one shared shape and one
five-value severity scale (`critical` / `high` / `medium` / `low` / `info`).
SARIF and tool-native JSON both map onto the same interface; collapse each native
severity vocabulary onto the scale, mapping **up** on disagreement and never
inventing a severity for a tool that reports none. Full interface, the SARIF and
native-JSON field mapping, and the severity anchor table:
[references/finding-normalization.md](references/finding-normalization.md).

## Step 3 - Deduplicate and record consensus

Merge records that describe the same defect using a domain-specific dedupe key,
keeping the highest severity and appending every producing tool to `caught_by`. A
finding with two or more entries in `caught_by` is a **consensus** finding:
higher confidence, surfaced first. Print the consensus count in the report
header.

```python
SEVERITY_RANK = {'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1}

def dedupe(findings, key_fn):
    seen = {}
    for f in findings:
        key = key_fn(f)
        if key not in seen:
            seen[key] = {**f, 'caught_by': []}
        elif SEVERITY_RANK.get(f['severity'], 0) > SEVERITY_RANK.get(seen[key]['severity'], 0):
            seen[key] = {**f, 'caught_by': seen[key]['caught_by']}
        seen[key]['caught_by'].append(f['scanner'])
    return list(seen.values())
```

The per-domain `key_fn` table, the class-normalization step for dynamic and
policy scanners, and the secret-verification classes:
[references/finding-normalization.md](references/finding-normalization.md).

## Step 4 - Enrich CVE findings

For findings that carry a CVE, add real-world exploitation signal from two public
feeds - EPSS (probability of exploitation) and CISA KEV (confirmed exploited in
the wild) - then sort into priority buckets instead of a raw severity sort:

```python
def priority(f):
    if f.get('vex_status') == 'not_affected':
        return 'Filtered-VEX'          # surfaced for audit; does not block
    if f.get('in_kev'):
        return 'Fix-Now'               # exploited in the wild
    if f['severity'] == 'critical' and (f.get('epss') or 0) > 0.5:
        return 'Fix-Now'
    if f['severity'] == 'critical':
        return 'Fix-This-Sprint'
    if f['severity'] == 'high' and (f.get('epss') or 0) > 0.3:
        return 'Fix-This-Sprint'
    if f.get('reachable') is False:
        return 'Fix-Backlog'
    if f['severity'] == 'high':
        return 'Fix-This-Sprint'
    if f['severity'] == 'medium':
        return 'Fix-Backlog'
    return 'Accept-Risk'
```

VEX filtering, reachability heuristics, and the tuning basis for the 0.5 / 0.3
EPSS cut-offs: [references/cve-enrichment.md](references/cve-enrichment.md).

## Step 5 - Validate and apply waivers

Waivers live in one committed YAML file per domain. A waiver is **rejected** (and
its finding stays active) if it is missing `expires:`, `approved_by:`, or
`reason:`, or if `expires:` is in the past. A rejected waiver is reported
explicitly, never a silent no-op. Some findings can never be waived: a CISA KEV
CVE, or a VEX `not_affected` with an empty justification.

```python
REQUIRED = ('expires', 'approved_by', 'reason')

def validate_waiver(w, today):
    for field in REQUIRED:
        if not w.get(field):
            return f"missing `{field}:`"       # rejection reason, or None if valid
    return f"expired {w['expires']}" if w['expires'] < today else None
```

The YAML schema, per-domain matching keys, and the refuse-to-proceed rules:
[references/waiver-schema.md](references/waiver-schema.md).

## Step 6 - Verdict

The gate is one comparison against a configured `fail_on` level, using the same
severity rank as the merge: any surviving finding at or above `fail_on` returns
BLOCK, otherwise PASS. Default `fail_on` is `critical`. Two domains swap the
severity test for a bucket test: secret detection blocks on any surviving
**Verified** finding, and CVE domains block on the **Fix-Now** bucket from Step
4. The verdict runs on the post-waiver list, and a finding whose waiver was
**rejected** is still in that list. The `verdict` function and the `fail_on`
rank: [references/cve-enrichment.md](references/cve-enrichment.md).

## Step 7 - Report

One comment, bucketed by severity, worst first. Never one comment per tool:
per-tool comments destroy the consensus signal and produce decision fatigue.

```markdown
## Security triage - `<sha>`

**Scanners run:** scanner-a 1.65.0, scanner-b 1.7.10
(scanner-c not configured in this repository)

**Total findings:** 47 (after deduplication; 23 multi-scanner consensus)
**Waivers:** 5 applied, 1 rejected
**Verdict:** BLOCK - 2 unwaived critical findings

### Critical (must fix before merge)

| Severity | Location | Finding | Caught by |
|---|---|---|---|
| critical | `src/auth/login.js:42` | SQL injection via string concatenation (CWE-89) | scanner-a, scanner-b |
| critical | `internal/crypto/sign.go:18` | Hardcoded private key (CWE-798) | scanner-b |

### High (must fix before next release)

| Severity | Location | Finding | Caught by |
|---|---|---|---|
| high | `app/views/admin.py:55` | Template auto-escaping disabled (CWE-79) | scanner-a |

### Medium / Low / Info

12 findings; full list in `triage-report.json`.

### Waived (5 applied, 1 rejected)

| Location | Rule | Reason | Expires | Approved by |
|---|---|---|---|---|
| `src/dev-only-server.js:42` | js/hardcoded-credentials | Dev-only localhost server | 2026-12-31 | alice@example.com |

**Rejected waiver:** `scripts/legacy.sh` is missing `approved_by:`; the finding remains active.

### Action items

1. **Fix the SQL injection in `login.js`.** Replace string concatenation
   with a parameterized query. Two scanners agree on this one.
2. **Remove the hardcoded key in `sign.go`.** Move it to a secret store
   and rotate the exposed key.

After the fixes, re-run the scanners and this triage.
```

Report hygiene: the header names both the scanners that ran and those that were
not configured ("no findings" and "did not run" are different outcomes); every
table keeps the `Caught by` column, which is why the merge exists; action items
are ordered by the gate, not by tool, and each names a concrete change.

## Worked example

A SAST scanner and a dependency scanner run on one commit. Scanner A (SAST) emits
SARIF; scanner B (dependency) emits native JSON. Both walk the dependency tree,
so both can flag a vulnerable package. Step 1 collects one SARIF file and one JSON
file.

After Step 2, normalized onto the shared shape and severity scale:

| scanner | rule_id | severity | location | cve |
|---|---|---|---|---|
| scanner-a | js/sql-injection | critical | `src/auth/login.js:42` | - |
| scanner-a | dep-cve | critical | `log4j-core@2.14.1` | CVE-2021-44228 |
| scanner-b | log4shell | critical | `log4j-core@2.14.1` | CVE-2021-44228 |
| scanner-b | prototype-pollution | medium | `lodash@4.17.20` | CVE-2024-1234 |

After Step 3, the SQL injection keys on `(file, line, cwe)`, and the two
`log4j-core` rows key on `(cve, package)` and merge into one finding carrying
`caught_by: [scanner-a, scanner-b]` - a consensus of 2. Result: 3 findings, 1
multi-scanner consensus.

Step 4 enriches the two CVEs. `CVE-2021-44228` (Log4Shell) is in CISA KEV, so it
lands in the `Fix-Now` bucket; `CVE-2024-1234` is not.

Step 5 processes `.sca-waivers.yaml`, which holds two waivers. The waiver for
`CVE-2024-1234` / `lodash@4.17.20` carries `reason`, `approved_by`, and a future
`expires`, so it is valid: the medium finding is suppressed and listed as waived.
The second waiver targets `CVE-2021-44228`, but it is **rejected** - a KEV CVE can
never be waived (Step 5 refuse-to-proceed rule) - so the log4j finding stays
active.

Step 6 with the default `fail_on: critical` leaves two active critical findings:
the SQL injection and the KEV-flagged log4j CVE. Both block. The PR comment:

```markdown
## Security triage - `9f2c1ab`

**Scanners run:** scanner-a 2.4.0, scanner-b 1.9.3
**Total findings:** 3 (after deduplication; 1 multi-scanner consensus)
**Waivers:** 1 applied, 1 rejected
**Verdict:** BLOCK - 2 unwaived critical findings

### Critical (must fix before merge)

| Severity | Location | Finding | Caught by |
|---|---|---|---|
| critical | `src/auth/login.js:42` | SQL injection via string concatenation (CWE-89) | scanner-a |
| critical | `log4j-core@2.14.1` | CVE-2021-44228 (Log4Shell), listed in CISA KEV | scanner-a, scanner-b |

**Rejected waiver:** `CVE-2021-44228` cannot be waived while listed in CISA KEV; the finding remains active.
```

The triage script exits non-zero on `BLOCK` and zero on `PASS`, so the pipeline
job fails on exactly the condition the comment states.

## CI integration

Run the scanners in their own jobs, publish their reports as artifacts, and run
triage once in a downstream job that consumes all of them.

```yaml
jobs:
  triage:
    needs: [scan-a, scan-b]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/download-artifact@v4
        with: { pattern: scan-*, merge-multiple: true }
      - run: |
          curl -sL https://epss.empiricalsecurity.com/epss_scores-current.csv.gz | gunzip > epss.csv
          curl -s https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json -o kev.json
      - run: python ci/triage.py --fail-on critical --out triage-report.md
      - if: always()
        run: gh pr comment "$PR" --body-file triage-report.md --edit-last --create-if-none
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
```

`gh pr comment` reads the body from a file with `--body-file`, and `--edit-last
--create-if-none` updates the previous comment instead of stacking a new one per
run (https://cli.github.com/manual/gh_pr_comment), so the pull request carries
exactly one live verdict.

Refresh the EPSS and KEV feeds per run, or pin a dated snapshot for
reproducibility. EPSS republishes daily (https://www.first.org/epss/model), so an
unpinned rerun of the same commit can legitimately produce different priority
buckets.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One comment per scanner | Reviewer reads N reports, never sees that two tools agree | One merged report (Step 7) |
| Dedupe on rule id | Rule ids are tool-specific, so nothing ever merges across tools | Key on location plus class (Step 3) |
| Dedupe on file only | Over-merges distinct defects in the same file | Full domain key (Step 3) |
| Waivers with no expiry | Exceptions become permanent, debt is invisible | Required `expires:` (Step 5) |
| Rejected waiver treated as a silent no-op | Author believes the waiver worked; the same waiver never gets fixed | Report every rejection (Step 5) |
| Sorting CVEs by CVSS alone | Misses exploitation-in-the-wild signal | Enrich with EPSS and KEV (Step 4) |
| Auto-suppressing low and info | Bucket becomes invisible, then medium follows it | All severities appear in the report (Step 7) |
| Passing when a configured scanner produced nothing | Turns a broken scan into a green build | Halt on missing artifact (Step 1) |

## Limitations

- **Rule-id drift.** Native rule ids change between tool versions, so exact-match
  waivers and class-normalization tables need maintenance; pin tool versions to
  bound the churn.
- **Class normalization is heuristic.** Two tools reporting one defect with
  different messages or missing CWE tags will not merge, and the report shows
  both.
- **Path templating.** One scanner reporting `/users/123` where another reports
  `/users/{id}` dedupes inconsistently unless the key normalizes path parameters
  first.
- **Reachability is an approximation.** Only runtime instrumentation proves a
  vulnerable path is unreachable.
- **KEV is a floor, not a census.** The catalog lists what has been confirmed
  exploited and added; absence from it is not evidence that a CVE is not being
  exploited
  (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).
- **The Accept-Risk bucket grows without bound** unless it is audited on a
  schedule, at which point the gate silently weakens.
