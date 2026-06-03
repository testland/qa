---
component: dast-finding-triager
type: agent
---

# dast-finding-triager - evals

Companion eval cases for [`dast-finding-triager`](../../dast-finding-triager.md).
Three cases cover happy path / branch / adversarial: a multi-scanner
consensus SQLi (verdict `BLOCK`), a clean scan with only Info findings
(verdict `PASS`), and a waiver missing `expires:` field (refuse-to-apply
rule, Step 5). Re-run by feeding the **Input** block as the first user
message and checking the agent's output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded
below are the eval-authoring date - each case is designed to be
reproducible against any tier.

## Eval 1 - happy path - multi-scanner consensus SQLi (BLOCK)

**Input:**

```
Triage DAST findings for this PR.

Configured scanners (per .github/workflows/dast.yml):
  - ZAP (zap-baseline.py present)
  - NightVision (nightvision-config.yaml present)
  - Burp Enterprise: NOT configured

zap.json (excerpt):
  {
    "site": [{
      "alerts": [{
        "pluginid": "40018",
        "alertRef": "40018-1",
        "alert": "SQL Injection",
        "risk": "High",
        "instances": [{
          "uri": "https://app.example.com/api/users/123",
          "method": "GET",
          "param": "id"
        }],
        "cweid": "89"
      }]
    }]
  }

nightvision.json (excerpt):
  {
    "findings": [{
      "type": "SQL_INJECTION",
      "severity": "Critical",
      "cwe": "CWE-89",
      "endpoint": {
        "url": "https://app.example.com/api/users/123",
        "method": "GET",
        "parameter": "id"
      },
      "evidence": "id=1' OR '1'='1 returned 200 with full user table"
    }]
  }

.dast-waivers.yaml:
  waivers: []   # empty
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects ZAP + NightVision (Burp not configured).
Step 2 normalizes severities: ZAP "High" → high, NightVision "Critical"
→ critical. Step 3 maps both to canonical class `SQL_INJECTION`. Step 4
dedupe key `('https://app.example.com/api/users/123', 'GET', 'id',
'SQL_INJECTION')` collapses both into one finding with
`caught_by=['zap', 'nightvision']` and the higher severity
(`critical`) wins. Step 5 finds no applicable waivers. Step 6 verdict:
`BLOCK` (unwaived critical present). Step 7 emits the report with a
"Critical (must fix before merge)" table containing one row referencing
both scanners. Refuse-to-proceed rule fires.

**Pass condition:** Output contains the literal string `BLOCK` AND the
literal string `SQL_INJECTION` (or `SQLi` / `SQL injection`) AND
mentions both `ZAP` (or `zap`) AND `NightVision` (or `nightvision`) on
the same finding (i.e., `caught_by` lists both). Output does NOT
contain a `PASS` verdict line.

## Eval 2 - branch - clean scan, only Info findings (PASS)

**Input:**

```
Triage DAST findings for this PR.

Configured scanners:
  - ZAP only (nightvision and Burp not configured per .github/workflows/dast.yml).

zap.json (excerpt):
  {
    "site": [{
      "alerts": [
        {
          "pluginid": "10049",
          "alert": "Cookie No HttpOnly Flag",
          "risk": "Informational",
          "instances": [{
            "uri": "https://app.example.com/legacy/admin/dashboard",
            "method": "GET",
            "param": ""
          }],
          "cweid": "1004"
        },
        {
          "pluginid": "10063",
          "alert": "Permissions Policy Header Not Set",
          "risk": "Informational",
          "instances": [{
            "uri": "https://app.example.com/",
            "method": "GET",
            "param": ""
          }]
        }
      ]
    }]
  }

.dast-waivers.yaml:
  waivers:
    - scanner: zap
      rule_id: "10049"
      url_pattern: "https://app.example.com/legacy/admin/*"
      reason: "Legacy admin pages; not exposed to end users; tracked in JIRA-1234"
      expires: 2026-12-31
      approved_by: alice@example.com
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects only ZAP. Step 2 normalizes both
"Informational" → `info`. Step 5 validates the waiver (has
`expires`, `approved_by`, `reason`; expiration not in the past) and
suppresses the Cookie No HttpOnly finding on `/legacy/admin/*`. The
remaining Permissions Policy finding is `info` severity. Step 6 verdict
function with `fail_on='critical'` (default): no findings at or above
critical → `PASS`. Step 7 emits report with `PASS` verdict, a "Waived
(1)" table row, and no Critical/High/Medium tables (or empty ones).

**Pass condition:** Output contains the literal string `PASS` AND
mentions the waiver was applied (one of `Waived`, `waived`,
`suppressed`, `JIRA-1234`). Output does NOT contain a `BLOCK` verdict
line AND does NOT list `SQL_INJECTION` / `XSS` / `PATH_TRAVERSAL`
in any output section.

## Eval 3 - adversarial - waiver missing expires: field (refuse)

**Input:**

```
Triage DAST findings for this PR.

Configured scanners:
  - ZAP only.

zap.json (excerpt):
  {
    "site": [{
      "alerts": [{
        "pluginid": "40018",
        "alert": "SQL Injection",
        "risk": "High",
        "instances": [{
          "uri": "https://app.example.com/api/orders",
          "method": "POST",
          "param": "filter"
        }],
        "cweid": "89"
      }]
    }]
  }

.dast-waivers.yaml:
  waivers:
    - scanner: zap
      rule_id: "40018"
      url_pattern: "https://app.example.com/api/orders"
      reason: "Known issue; team will fix next sprint"
      approved_by: bob@example.com
      # NOTE: no expires: field
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 5 detects that the waiver is missing the required
`expires:` field and refuses to apply it (per the Step 5 waiver-
validation rule and the Refuse-to-proceed rule: "Apply waivers without
`expires:` field" is explicitly refused). The agent emits an error /
warning naming the missing field and the offending waiver entry, then
treats the SQL injection finding as unwaived. Step 6: the High SQLi is
not critical-severity but the report MUST not treat it as suppressed.
The agent's verdict for the finding follows from `fail_on='critical'`
default (High is below threshold → `PASS` on threshold), BUT the
waiver-rejection itself must be surfaced - and per the documented
refusal rule, the agent must refuse to *apply* the waiver. The
expected behavior is therefore: emit a refusal naming the missing
`expires:`, list the SQLi finding as unwaived in the High table, and
not mark the waiver as applied.

**Pass condition:** Output contains the literal string `expires` AND
references the missing/required field (one of `missing`, `required`,
`must include`, `refuse`, `rejected`). Output does NOT emit a "Waived"
table row for this waiver AND does NOT silently apply the waiver
(i.e., the SQL Injection finding for `/api/orders` MUST appear in the
unwaived findings list, not the "Waived (N)" section).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to run a live DAST scan.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (verdict labels, scanner names,
  canonical class names).
- The agent's tool surface (`Read`, `Bash(jq *)`) is read-only - 
  eval re-runs cannot modify scanner reports or the waiver file.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
