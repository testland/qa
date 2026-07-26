---
name: multi-tool-finding-triage
description: "Merges two or more security scanner reports into one gate: normalizes each into a canonical Finding, deduplicates on a per-domain key while recording `caught_by` multi-scanner consensus, validates a waiver file (rejecting any missing `expires:` / `approved_by:` / `reason:` or expired), enriches CVE findings with EPSS + CISA KEV, then applies a `fail_on` severity threshold to emit BLOCK or PASS plus a bucketed PR comment. Works across static, dynamic, secret, dependency, container, and IaC scanners. To run or configure a single scanner instead, use semgrep-rules, codeql-queries, bandit-python, or gosec-go; this runs after them to merge output - the cross-scanner gate, not a single-scanner wrapper."
---

# multi-tool-finding-triage

## Overview

Several security scanners produce several reports, each with its own
schema, its own severity vocabulary, and its own idea of what counts as
one finding. Reviewers read N reports, miss that two tools flagged the
same line, and rubber-stamp the pull request. This is the tool-agnostic
pipeline that turns N reports into one decision:

```
collect -> normalize -> dedupe (+ consensus) -> enrich -> waive -> verdict -> report
```

**Differentiation axis.** Documentation for an individual scanner covers
installing it, writing its rules, and reading its native output. This is
the cross-scanner method that runs *after* those wrappers: schema
normalization, the dedupe key, waiver validation, and the gate. It owns
no scanner-specific rule syntax, no scanner config, and no scan
invocation beyond collecting artifacts.

The method applies unchanged across six domains: static code analysis,
dynamic web scanning, secret detection, dependency CVE scanning,
container image and SBOM CVE scanning, and infrastructure policy
scanning. Only the dedupe key (Step 3) and the enrichment (Step 4) differ
per domain.

## Step 1 - Collect scanner output

Accept **any subset** of the configured scanners. Never fabricate a data
source that did not run, and never silently skip a scanner whose output
artifact is present.

1. Discover artifacts in the workspace or CI download directory (the
   `*.json` and `*.sarif` reports each tool wrote).
2. Record which tools produced output and which did not, so the report
   distinguishes "clean" from "never ran".
3. If **no** artifact is found, halt with `NO_SCANNER_OUTPUT`: supply at
   least one scanner report.
4. If a tool is configured in the repository (config file present, or
   invoked in the pipeline definition) but produced no artifact, halt
   rather than pass.

## Step 2 - Normalize to the canonical Finding

Every report becomes a list of records with this shape. Fields marked
optional are populated only where the source domain supplies them.

```typescript
interface Finding {
  scanner: string;          // producing tool, lowercase id
  rule_id: string;          // native rule identifier, verbatim
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;          // one-line human description
  // location: at least one group is required
  file?: string; line?: number;                    // source / config scanners
  url?: string; method?: string; parameter?: string;  // dynamic web scanners
  package?: string;         // dependency + container scanners: eco:name@version
  // classification
  cwe?: string;             // "CWE-89"
  cve?: string;             // "CVE-2021-44228" or "GHSA-xxxx"
  finding_class?: string;   // canonical class: "SQL_INJECTION", "XSS", ...
  secret_class?: string;    // "AWS Access Key", "GitHub PAT", ...
  verified?: boolean;       // secret scanners: live-verified credential
  // enrichment (Step 4)
  cvss_base?: number;       // 0.0 - 10.0
  epss?: number;            // 0.0 - 1.0
  in_kev?: boolean; vex_status?: string; reachable?: boolean;
  fix_available?: string;   // version or config change that resolves it
  caught_by: string[];      // every scanner that produced this finding (Step 3)
}
```

### Reading the native report

Two report shapes cover most tools:

- **SARIF.** A SARIF run reports each finding as a `result` object whose
  `ruleId` is "a stable value which an analysis tool associates with a
  rule", whose `locations[]` gives the physical file position, and whose
  optional `properties` bag carries tool-specific extras (OASIS SARIF
  v2.1.0 sections 3.27.5, 3.27.12, 3.8, and 3.27.10 for `level`:
  https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/sarif-v2.1.0-errata01-os-complete.html).
- **Tool-native JSON.** Read the field names from that tool's own
  documentation and map them onto the interface above. Record the tool
  version, because native field names and rule ids drift between
  releases.

### Severity normalization

Collapse every native vocabulary onto the five-value scale above. Three
anchors make the mapping defensible instead of arbitrary:

| Source signal | Mapping | Anchor |
|---|---|---|
| CVSS base score | 9.0 to 10.0 critical, 7.0 to 8.9 high, 4.0 to 6.9 medium, 0.1 to 3.9 low, 0.0 none | CVSS v3.1 qualitative severity rating scale, Table 14: https://www.first.org/cvss/v3.1/specification-document |
| SARIF `security-severity` property (numeric string) | over 9.0 critical, 7.0 to 8.9 high, 4.0 to 6.9 medium, 0.1 to 3.9 low; 0.0 or out of range means no security severity | https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning |
| SARIF `result.level` | `error` to high, `warning` to medium, `note` to low, `none` to info | Permitted values are `none`, `note`, `warning`, `error` per SARIF v2.1.0 section 3.27.10 (link above) |

For a tool that emits only its own labels and no CVSS or SARIF level,
keep a per-tool mapping table in the repository, sourced from that tool's
documentation and versioned next to the triage script: label sets change
between tool versions, so the mapping is data, not pipeline code.

Two rules govern the mapping. Map **up**, never down: when two tools
disagree on the same deduped finding, keep the highest severity (Step 3).
And never invent a severity for a tool that reports none: use `info` and
say so in the report.

## Step 3 - Deduplicate and record consensus

The dedupe key is the smallest tuple that identifies the same underlying
defect across tools. It is domain-specific:

| Domain | Dedupe key |
|---|---|
| Static code analysis | `(file, line, cwe or rule_id)` |
| Dynamic web scanning | `(url, method, parameter, finding_class)` |
| Secret detection | `(file, line, secret_class)` |
| Dependency and container CVEs | `(cve, package)` |
| Infrastructure policy | `(file, line, normalized_issue_class)` |

Dynamic scanners and policy scanners need one extra step before the key
is usable: **class normalization.** Each tool names the same defect
differently, so map native rule ids onto a canonical class token
(`SQL_INJECTION`, `XSS`, `PATH_TRAVERSAL`, and so on) and key on the
canonical token. Keep the mapping in a versioned file; rule ids evolve.

```python
SEVERITY_RANK = {'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1}

def dedupe(findings, key_fn):
    seen = {}
    for f in findings:
        key = key_fn(f)
        if key not in seen:
            seen[key] = {**f, 'caught_by': []}
        elif SEVERITY_RANK.get(f['severity'], 0) > SEVERITY_RANK.get(seen[key]['severity'], 0):
            merged = {**f, 'caught_by': seen[key]['caught_by']}
            seen[key] = merged
        seen[key]['caught_by'].append(f['scanner'])
    return list(seen.values())
```

`caught_by` is the point of the merge, not a byproduct. A finding
reported by two or more independent tools is a **consensus** finding:
higher confidence, lower chance of being a false positive, and the first
thing the report should surface. Print the consensus count in the report
header ("47 findings after deduplication; 23 multi-scanner consensus").

Consensus also drives classification where tools differ in verification
capability. Secret detection is the clearest case:

| Class | Condition |
|---|---|
| Verified | A tool confirmed the credential live. TruffleHog reports `"Verified":true` after "programmatic verification against the API that we think it belongs to" (https://github.com/trufflesecurity/trufflehog) |
| Unverified consensus | `verified` false, but two or more tools flagged the same tuple |
| Inconclusive | `verified` false, single tool only. Detectors that match on regex and entropy alone, such as gitleaks (https://github.com/gitleaks/gitleaks), never set `verified` |

## Step 4 - Enrich CVE findings

This step applies only where the finding carries a CVE. Severity alone
ranks static danger; two public feeds add real-world exploitation
signal.

**EPSS** is "a daily estimate of the probability of exploitation
activity being observed over the next 30 days", scored 0 to 1 with a
percentile (https://www.first.org/epss/model). Two access paths:

**CISA KEV** is the "CISA Catalog of Known Exploited Vulnerabilities":
vulnerabilities with reliable evidence of exploitation in the wild. The
JSON feed exposes `catalogVersion`, `count`, and a `vulnerabilities[]`
array whose entries carry `cveID`, `dateAdded`, and `requiredAction`
(https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).

```bash
# EPSS bulk daily feed; columns are cve,epss,percentile after a #model_version header
curl -sL https://epss.empiricalsecurity.com/epss_scores-current.csv.gz | gunzip > epss.csv
grep "^CVE-2021-44228," epss.csv

# EPSS per-CVE API
curl -s "https://api.first.org/data/v1/epss?cve=CVE-2021-44228"
# {"data":[{"cve":"CVE-2021-44228","epss":"0.999990000","percentile":"1.000000000", ...}]}

# CISA KEV membership
curl -s https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json -o kev.json
jq '.vulnerabilities[] | select(.cveID == "CVE-2021-44228")' kev.json
```

**VEX**, where the project publishes one, filters findings already
analyzed by the vendor or the team. OpenVEX defines four statuses:
`not_affected`, `affected`, `fixed`, `under_investigation`, and a
`not_affected` statement "required the addition of a `justification`"
(https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md). Filter on
`not_affected` only when that justification is populated, and list
filtered findings in an audit table rather than dropping them.

**Reachability** is optional and, without runtime instrumentation,
always heuristic: an unused dependency, a dev-only or test-scope
dependency, a vulnerable API that is never imported. Treat a false
reachability result as a strong signal to deprioritize, never as proof
of safety.

Priority buckets for CVE domains, replacing the raw severity sort:

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

The 0.5 and 0.3 EPSS cut-offs are starting points, not standards: EPSS
publishes probabilities and expects each organization to pick thresholds
matching its own capacity and risk tolerance
(https://www.first.org/epss/model). Record the chosen values in the
repository next to the triage script.

## Step 5 - Validate and apply waivers

Waivers live in one committed YAML file per domain, named for the gate
it feeds (`.sast-waivers.yaml`, `.dast-waivers.yaml`,
`.secrets-waivers.yaml`, `.sca-waivers.yaml`, `.vuln-waivers.yaml`,
`.iac-waivers.yaml`). One schema, with exact-match keys or `*_pattern`
glob keys:

```yaml
waivers:
  # exact-match waiver, code / policy domain
  - scanner: scanner-a
    rule_id: js/hardcoded-credentials
    file: src/dev-only-server.js
    line: 42
    reason: "Dev-only server; runs on localhost without TLS by design"
    expires: 2026-12-31
    approved_by: alice@example.com

  # pattern waiver: any scanner, any matching path
  - scanner_pattern: "*"
    rule_id_pattern: "K8S_*"
    file_pattern: "helm/dev-overrides/**"
    reason: "Dev overrides; not deployed to production"
    expires: 2026-09-30
    approved_by: platform-team

  # CVE-domain waiver
  - cve: CVE-2024-1234
    package: lodash@4.17.20
    reason: "Vulnerable function not in the call path; verified via dependency tree"
    expires: 2026-12-31
    approved_by: alice@example.com
```

Matching keys per domain: `scanner` / `rule_id` / `file` / `line` for
code and policy findings, `url_pattern` / `finding_class` for dynamic
findings, `cve` / `package` for CVE findings. Any `*_pattern` variant
takes a glob.

**Validation rules. A waiver that fails any of these is rejected, and
the underlying finding stays active:**

- `expires:` missing.
- `expires:` in the past relative to today.
- `approved_by:` missing or empty.
- `reason:` missing or empty.

A rejected waiver is never a silent no-op. Report it explicitly, with
the reason for rejection, so the author fixes the waiver instead of
assuming it applied.

**Refuse-to-proceed rules:**

- Never waive a CVE listed in CISA KEV. Active exploitation in the wild
  admits no acceptable justification
  (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).
- Never accept a VEX `not_affected` status with an empty justification
  (https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md).
- Never auto-fix a finding. Report and recommend only.
- Never suppress a whole severity bucket. Low and info findings still
  appear in the report, below the fold.

```python
REQUIRED = ('expires', 'approved_by', 'reason')

def validate_waiver(w, today):
    for field in REQUIRED:
        if not w.get(field):
            return f"missing `{field}:`"       # rejection reason, or None if valid
    return f"expired {w['expires']}" if w['expires'] < today else None
```

## Step 6 - Verdict

The gate is one comparison against a configured `fail_on` level, using
the same severity rank as the merge:

```python
def verdict(findings, fail_on='critical'):
    rank = {'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1}
    threshold = rank.get(fail_on, 5)
    blocking = [f for f in findings if rank.get(f['severity'], 0) >= threshold]
    return ('BLOCK', blocking) if blocking else ('PASS', [])
```

Default `fail_on` is `critical`: any unwaived critical finding blocks.
Infrastructure policy gates commonly run at `fail_on: high`, where
misconfiguration findings cluster. Two domains swap the severity test for
a bucket test: secret detection blocks on any surviving **Verified**
finding (a live credential has no low-severity reading), and CVE domains
block on the **Fix-Now** bucket from Step 4.

The verdict runs on the post-waiver list, and a finding whose waiver was
**rejected** is still in that list.

## Step 7 - Report

One comment, bucketed by severity, worst first. Never one comment per
tool: per-tool comments destroy the consensus signal and produce
decision fatigue.

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

Report hygiene: the header names both the scanners that ran and those
that were not configured ("no findings" and "did not run" are different
outcomes); every table keeps the `Caught by` column, which is why the
merge exists; action items are ordered by the gate, not by tool, and
each names a concrete change.

## Worked example

Two scanners run on one commit: scanner A emits SARIF, scanner B emits
native JSON, and `.sast-waivers.yaml` holds two waivers. Step 1 collects
3 SARIF results and 2 native findings.

After Step 2, normalized (severity from `security-severity` 9.1 and 8.2
for A, from the tool's own HIGH label for B):

| scanner | rule_id | severity | file:line | cwe |
|---|---|---|---|---|
| scanner-a | js/sql-injection | critical | `src/auth/login.js:42` | CWE-89 |
| scanner-a | js/hardcoded-credentials | high | `src/dev-only-server.js:42` | CWE-798 |
| scanner-a | js/weak-hash | medium | `src/util/hash.js:9` | CWE-328 |
| scanner-b | SQLI-001 | high | `src/auth/login.js:42` | CWE-89 |
| scanner-b | CRED-004 | high | `src/dev-only-server.js:42` | CWE-798 |

After Step 3, keyed on `(file, line, cwe)`: 3 findings, 2 of them
consensus. The `login.js:42` entry keeps `critical` (map up) and carries
`caught_by: [scanner-a, scanner-b]`.

Step 5 processes the two waivers. Waiver 1 targets
`src/dev-only-server.js` line 42 and carries `reason`, `approved_by`, and
a future `expires`, so it is valid: the CWE-798 finding is suppressed and
listed as waived. Waiver 2 targets `src/util/hash.js` with no
`approved_by:`, so it is rejected: the medium finding stays active and
the rejection is reported.

Step 6 with the default `fail_on: critical` leaves 2 findings (1
critical, 1 medium), of which 1 has rank >= 5. Expected output header:

```markdown
## Security triage - `9f2c1ab`

**Scanners run:** scanner-a 2.4.0, scanner-b 1.9.3
**Total findings:** 3 (after deduplication; 2 multi-scanner consensus)
**Waivers:** 1 applied, 1 rejected
**Verdict:** BLOCK - 1 unwaived critical finding
```

The triage script exits non-zero on `BLOCK` and zero on `PASS`, so the
pipeline job fails on exactly the condition the comment states.

## CI integration

Run the scanners in their own jobs, publish their reports as artifacts,
and run triage once in a downstream job that consumes all of them.

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

`gh pr comment` reads the body from a file with `--body-file`, and
`--edit-last --create-if-none` updates the previous comment instead of
stacking a new one per run (https://cli.github.com/manual/gh_pr_comment),
so the pull request carries exactly one live verdict.

Refresh the EPSS and KEV feeds per run, or pin a dated snapshot for
reproducibility. EPSS republishes daily
(https://www.first.org/epss/model), so an unpinned rerun of the same
commit can legitimately produce different priority buckets.

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

- **Rule-id drift.** Native rule ids change between tool versions, so
  exact-match waivers and class-normalization tables need maintenance;
  pin tool versions to bound the churn.
- **Class normalization is heuristic.** Two tools reporting one defect
  with different messages or missing CWE tags will not merge, and the
  report shows both.
- **Path templating.** One scanner reporting `/users/123` where another
  reports `/users/{id}` dedupes inconsistently unless the key normalizes
  path parameters first.
- **Reachability is an approximation.** Only runtime instrumentation
  proves a vulnerable path is unreachable.
- **KEV is a floor, not a census.** The catalog lists what has been
  confirmed exploited and added; absence from it is not evidence that a
  CVE is not being exploited
  (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).
- **The Accept-Risk bucket grows without bound** unless it is audited on
  a schedule, at which point the gate silently weakens.
