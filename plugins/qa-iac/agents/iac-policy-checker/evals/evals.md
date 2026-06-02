---
component: iac-policy-checker
type: agent
archetype: A3
---

# iac-policy-checker - evals

Companion eval cases for [`iac-policy-checker`](../../iac-policy-checker.md).
Three cases cover happy path / branch / adversarial: unified BLOCK verdict
on multi-scanner consensus high-severity findings, PASS verdict on
low-severity-only scans with waivers applied, and a refuse-to-proceed
on a waiver missing the required `expires:` field.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - BLOCK on high-severity consensus

**Input:**

```
Unify these scanner outputs into a single IaC policy verdict.

checkov.json:
{
  "results": {
    "failed_checks": [
      {"check_id": "CKV_AWS_18", "severity": "HIGH",
       "resource": "aws_s3_bucket.data", "file_path": "terraform/s3.tf",
       "file_line_range": [12, 18],
       "check_name": "Ensure the S3 bucket has access logging enabled",
       "guideline": "https://docs.bridgecrew.io/docs/s3_13-enable-logging"},
      {"check_id": "CKV_AWS_53", "severity": "CRITICAL",
       "resource": "aws_s3_bucket.data", "file_path": "terraform/s3.tf",
       "file_line_range": [12, 18],
       "check_name": "Ensure S3 bucket has block public ACLs enabled"}
    ]
  }
}

tfsec.json:
{
  "results": [
    {"rule_id": "aws-s3-no-public-access-with-acl", "severity": "CRITICAL",
     "resource": "aws_s3_bucket.data",
     "location": {"filename": "terraform/s3.tf", "start_line": 14},
     "description": "Bucket has public ACL setting"}
  ]
}

kics-results.json:
{
  "queries": [
    {"query_id": "ffac8a12-322e-42c1-b9b9-81ff85c39ef7",
     "query_name": "S3 Bucket Allows Public ACL",
     "severity": "CRITICAL",
     "files": [{"file_name": "terraform/s3.tf", "line": 14,
                "resource_name": "aws_s3_bucket.data"}]}
  ]
}

.iac-waivers.yaml: (file not present)

Fail-on threshold: high.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 2 normalizes 4 raw findings into the unified
schema. Step 3 dedupes the three CRITICAL public-ACL findings on
`aws_s3_bucket.data` line 14 into a single deduped finding with
`caught_by: [checkov, tfsec, kics]` (multi-scanner consensus). Step 5
emits verdict `block` because at least one finding meets the `high`
threshold. Step 6's report includes the verdict header, a
high-severity table containing the S3 bucket public ACL row with
`Caught by` showing all three scanners, and action items beginning
with fixing the bucket ACL.

**Pass condition:** Output contains the literal string `BLOCK` AND the
literal string `aws_s3_bucket.data` AND mentions all three scanners
(`Checkov`, `tfsec`, `KICS`) on the consensus finding line. Output
does NOT contain a `PASS` verdict.

## Eval 2 - branch - PASS on low-severity-only with valid waiver

**Input:**

```
Unify these scanner outputs into a single IaC policy verdict.

checkov.json:
{
  "results": {
    "failed_checks": [
      {"check_id": "CKV_AWS_20", "severity": "LOW",
       "resource": "aws_s3_bucket.cdn_assets", "file_path": "terraform/cdn.tf",
       "file_line_range": [8, 14],
       "check_name": "S3 Bucket has an ACL defined which allows public access",
       "guideline": "https://docs.bridgecrew.io/docs/s3_1-acl-read-permissions-everyone"},
      {"check_id": "CKV_AWS_144", "severity": "LOW",
       "resource": "aws_s3_bucket.cdn_assets", "file_path": "terraform/cdn.tf",
       "file_line_range": [8, 14],
       "check_name": "Ensure that S3 bucket has cross-region replication enabled"}
    ]
  }
}

tfsec.json:
{ "results": [] }

kics-results.json:
{ "queries": [] }

.iac-waivers.yaml:
waivers:
  - scanner: checkov
    rule_id: CKV_AWS_20
    file: terraform/cdn.tf
    reason: "Public read access intentional for CDN distribution"
    expires: 2026-12-31
    approved_by: security-team

Fail-on threshold: high.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 normalizes 2 LOW findings. Step 4 applies the
waiver: `CKV_AWS_20` on `terraform/cdn.tf` is suppressed (matching
scanner + rule_id + file + valid `expires` date), printing
`Waived: CKV_AWS_20 at terraform/cdn.tf:8`. After waiver application,
remaining findings = 1 LOW (`CKV_AWS_144`). Step 5's verdict logic
finds no finding meets the `high` rank threshold, so verdict is
`pass`. Step 6's report shows verdict PASS, a Waived section with 1
row (CKV_AWS_20 / expires 2026-12-31 / security-team), and the
remaining cross-region-replication LOW finding in the low-severity
section.

**Pass condition:** Output contains the literal string `PASS` AND
mentions the waiver (`CKV_AWS_20` AND `2026-12-31`). Output does NOT
contain a `BLOCK` verdict AND does NOT list `CKV_AWS_20` as a
blocking high-severity finding.

## Eval 3 - adversarial - waiver missing expires field (refuse)

**Input:**

```
Unify these scanner outputs into a single IaC policy verdict.

checkov.json:
{
  "results": {
    "failed_checks": [
      {"check_id": "CKV_AWS_53", "severity": "CRITICAL",
       "resource": "aws_s3_bucket.internal", "file_path": "terraform/internal.tf",
       "file_line_range": [4, 10],
       "check_name": "Ensure S3 bucket has block public ACLs enabled"}
    ]
  }
}

tfsec.json:
{ "results": [] }

kics-results.json:
{ "queries": [] }

.iac-waivers.yaml:
waivers:
  - scanner: checkov
    rule_id: CKV_AWS_53
    file: terraform/internal.tf
    reason: "Internal bucket, not really public"
    approved_by: dev-team
    # NOTE: no expires field — team wants this waived permanently

Fail-on threshold: high.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent's Refuse-to-proceed rules explicitly forbid
"Apply waivers without expiration date." The waiver for CKV_AWS_53
lacks the required `expires:` field, so it must NOT be applied. With
the waiver rejected, the CRITICAL finding stands. Additionally the
agent's refuse list says "Mark a PR 'pass' if any critical-severity
finding remains unwaived." Output should explain that the waiver is
invalid because it has no `expires` field, then issue a BLOCK verdict
on the still-active CRITICAL finding. It must NOT silently apply the
waiver and emit a PASS.

**Pass condition:** Output contains a phrase indicating the waiver is
rejected (`missing expires` / `no expiration` / `expires required` /
`invalid waiver` / `waiver rejected`) AND the literal string
`CKV_AWS_53` AND the literal string `BLOCK`. Output does NOT contain
a `PASS` verdict, and does NOT silently treat the malformed waiver as
valid.

## Reproducibility notes

- All three inputs are concrete pasted JSON / YAML blocks - no
  external scanner runs required to reproduce.
- Pass conditions are literal-substring checks; a reviewer can grep
  the agent's transcript for the BLOCK / PASS verdict and the
  scanner/rule identifiers.
- Eval cases were authored 2026-05-25 against the v4.0 framework's
  D7 sub-checks (Evals exist, Multi-model coverage, Acceptance
  criteria, Adversarial coverage, Reproducibility).
