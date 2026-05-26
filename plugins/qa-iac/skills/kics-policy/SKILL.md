---
name: kics-policy
description: "Configures KICS (Keeping Infrastructure as Code Secure) for IaC scanning — Checkmarx open-source tool covering Terraform, Kubernetes, Helm, Dockerfile, Docker Compose, OpenAPI, Ansible, ARM, CloudFormation, Pulumi, Crossplane, Knative. CLI / Docker / GitHub Action / pre-commit integrations. Output to JSON / SARIF / HTML / JUnit. Use as a complement to Checkov + tfsec — KICS catches different rule classes (broader IaC + OpenAPI / Pulumi / Crossplane support)."
rating: 22
d6: 3
archetype: S1
---

# kics-policy

## Overview

KICS (Keeping Infrastructure as Code Secure) covers Terraform,
Kubernetes, Helm, Dockerfile, Docker Compose, OpenAPI, Ansible,
ARM, CloudFormation, Pulumi, Crossplane, Knative — comparable
breadth to Checkov.

KICS's specific strengths:
- OpenAPI scanning (uncommon in other IaC scanners).
- Pulumi + Crossplane support (Checkov has Pulumi too; KICS broader).
- Lightweight Docker image; portable in restricted CI.

## When to use

- Need OpenAPI security scanning (security misconfigs in API specs).
- Pulumi / Crossplane stack.
- Want a third opinion alongside Checkov + tfsec (different rules
  catch different things).

## Step 1 — Install

```bash
# Docker (recommended)
docker pull checkmarx/kics:latest

# Or binary
curl -sfL https://raw.githubusercontent.com/Checkmarx/kics/master/install.sh | sh
```

## Step 2 — Run

```bash
# Scan a directory (Docker)
docker run -v "$PWD:/path" checkmarx/kics scan -p /path --output-path /path/results

# Or via binary
kics scan -p . --output-path ./kics-results

# Specific platform
kics scan -p . -t terraform,kubernetes
```

## Step 3 — Output formats

```bash
# JSON
kics scan -p . --report-formats json --output-path results/

# SARIF (GitHub Code Scanning)
kics scan -p . --report-formats sarif --output-path results/

# JUnit XML
kics scan -p . --report-formats junit --output-path results/

# HTML (human-readable)
kics scan -p . --report-formats html --output-path results/

# Multiple
kics scan -p . --report-formats json,sarif,html --output-path results/
```

## Step 4 — Severity threshold

```bash
# Fail only on HIGH+
kics scan -p . --fail-on high,critical

# Don't fail; just report
kics scan -p . --no-progress --silent
```

## Step 5 — Skip checks

In code:

```hcl
# main.tf
resource "aws_s3_bucket" "public_data" {
  # kics-scan ignore-line
  acl    = "public-read"
  bucket = "my-public-data"
}
```

For block-level:

```hcl
# kics-scan disable=15ffbacc-fa42-4f6f-a57d-2feac7365caa
resource "aws_s3_bucket" "public_logs" {
  acl    = "public-read"
  bucket = "my-public-logs"
}
```

The disable directive references the specific KICS query ID
(visible in the output).

## Step 6 — Custom queries (Rego)

KICS queries are written in Rego (same as OPA):

```rego
# custom-queries/aws/cost_center_tag/query.rego
package Cx

CxPolicy[result] {
    resource := input.document[i].resource.aws_instance[name]
    not resource.tags.cost_center
    result := {
        "documentId": input.document[i].id,
        "searchKey": sprintf("aws_instance[%s]", [name]),
        "issueType": "MissingAttribute",
        "keyExpectedValue": "Should have a cost_center tag",
        "keyActualValue": "tags.cost_center is missing",
    }
}
```

```bash
kics scan -p . -q ./custom-queries/
```

## Step 7 — CI integration

```yaml
jobs:
  kics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: checkmarx/kics-github-action@v2
        with:
          path: .
          fail_on: high,critical
          output_formats: sarif
          output_path: kics-results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: kics-results.sarif
```

## Step 8 — OpenAPI scanning

KICS's distinguishing feature: scan OpenAPI specs for security
issues:

```bash
kics scan -p ./api-spec.yaml -t openapi
```

Catches:

- Missing authentication on sensitive endpoints.
- Weak HTTP methods (PUT / DELETE without auth).
- Missing rate-limit headers.
- Unrestricted file upload endpoints.

For most teams, this is the unique reason to use KICS alongside
Checkov.

## Step 9 — Pulumi / Crossplane

```bash
kics scan -p ./pulumi-project/ -t pulumi
kics scan -p ./crossplane-config/ -t crossplane
```

For Pulumi shops, KICS provides scanning that Checkov / tfsec
don't.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| KICS as only IaC scanner                                              | Misses Checkov / tfsec-specific findings.                                | Use multiple (Step 7 + iac-policy-checker). |
| `kics-scan ignore-line` without comment justifying                    | Skips invisible.                                                          | Always include reason. |
| Skipping `--fail-on` severity in CI                                    | All findings (including LOW) fail; team disables.                       | Start `--fail-on high,critical` (Step 4). |
| Running on every PR with full output                                   | Output overwhelming; team ignores.                                      | Severity threshold + JSON/SARIF for triage. |
| Custom queries without tests                                            | Bugs let bad config through.                                              | Test custom queries via OPA test pattern. |

## Limitations

- **Dockerized usage adds CI complexity.** Smaller teams prefer
  binary install.
- **Per-platform rule depth varies.** Some platforms (Pulumi,
  Crossplane) have fewer rules than Terraform / K8s.
- **Maintenance pace varies per platform.** Newer Crossplane
  releases may not be covered immediately.
- **Custom query learning curve.** Rego is the language; same
  curve as OPA.

## References

- KICS at `kics.io` and `github.com/Checkmarx/kics`.
- [`checkov-policy`](../checkov-policy/SKILL.md),
  [`tfsec-policy`](../tfsec-policy/SKILL.md) — sister scanners.
- [`policy-as-code-runner`](../policy-as-code-runner/SKILL.md) —
  custom OPA / Rego.
- [`iac-policy-checker`](../../agents/iac-policy-checker.md) —
  combines results.
