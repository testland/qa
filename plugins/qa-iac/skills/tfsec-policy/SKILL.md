---
name: tfsec-policy
description: "Configures tfsec for Terraform-specific security scanning - covers AWS / Azure / GCP / Kubernetes / OpenStack / Oracle / DigitalOcean / CloudStack with developer-friendly output. Important: tfsec is **transitioning to Trivy** per Aqua Security''''s positioning; new projects evaluate Trivy first. For existing tfsec users, this skill covers config + custom rules + CI integration. Use for Terraform-only projects mid-transition or where tfsec''''s specific check coverage matters."
rating: 22
d6: 4
archetype: S1
---

# tfsec-policy

## Overview

[tfs]: https://aquasecurity.github.io/tfsec/v1.28.13/

**Important migration note** per [tfsec-home][tfs]:

> "tfsec is transitioning to **Trivy**, Aqua Security's
> consolidated scanning solution. The project documentation notes:
> 'Going forward we want to encourage the tfsec community to
> transition over to Trivy.'"

For new projects: evaluate Trivy first. tfsec remains stable for
existing usage.

## When to use

- Existing tfsec project; team isn't ready to migrate to Trivy.
- Terraform-only stack; want a focused Terraform-specific
  scanner.
- A specific tfsec rule covers something Trivy doesn't yet.

## Step 1 - Install

```bash
# macOS
brew install tfsec

# Linux
curl -L https://github.com/aquasecurity/tfsec/releases/latest/download/tfsec-linux-amd64 \
  -o /usr/local/bin/tfsec
chmod +x /usr/local/bin/tfsec
```

## Step 2 - Run

```bash
# Scan current directory
tfsec .

# Scan specific path
tfsec ./terraform/

# Concise output
tfsec . --concise-output

# Specific severity threshold
tfsec . --minimum-severity HIGH
```

## Step 3 - Output formats

Per [tfsec-home][tfs]: "JSON and SARIF output capabilities for
integration with external tools and workflows."

```bash
# JSON
tfsec . -f json > tfsec.json

# SARIF (GitHub Code Scanning)
tfsec . -f sarif -O tfsec.sarif

# JUnit XML
tfsec . -f junit -O tfsec.xml

# Markdown (PR comments)
tfsec . -f markdown
```

## Step 4 - Skip checks

```bash
# Skip specific checks
tfsec . -e aws-s3-enable-bucket-encryption,aws-s3-enable-versioning

# Skip everything matching a pattern
tfsec . -e aws-s3-*
```

Inline:

```hcl
# main.tf
resource "aws_s3_bucket" "public_data" {
  # tfsec:ignore:aws-s3-enable-bucket-encryption Public dataset, not encrypted by design
  # tfsec:ignore:aws-s3-enable-bucket-logging Public CDN, no audit logging needed
  bucket = "my-public-data"
  acl    = "public-read"
}
```

## Step 5 - Custom rules

```yaml
# .tfsec/custom_checks.yml
checks:
  - code: CUS001
    description: Ensure all EC2 instances have a cost_center tag
    impact: Untagged resources cannot be allocated to cost centers
    resolution: Add a cost_center tag
    requiredTypes:
      - resource
    requiredLabels:
      - aws_instance
    severity: HIGH
    matchSpec:
      name: tags
      action: contains
      value: cost_center
    errorMessage: EC2 instance is missing cost_center tag
```

## Step 6 - CI integration

```yaml
jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: aquasecurity/tfsec-action@v1.0.3
        with:
          additional_args: --minimum-severity HIGH
          format: sarif
          output_file_path: tfsec.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: tfsec.sarif
```

## Step 7 - Supported clouds

Per [tfsec-home][tfs]:

> "AWS: API Gateway, EC2, S3, RDS, IAM, Lambda, and 30+
> additional services
>
> Azure: App Service, Storage, Database, Container, Key Vault,
> and others
>
> Google Cloud: Compute, GKE, SQL, Storage, IAM, BigQuery, and
> more
>
> Additional support includes Kubernetes, OpenStack, Oracle,
> DigitalOcean, and CloudStack environments."

For unsupported clouds, fall back to OPA / Conftest with custom
Rego per [`policy-as-code-runner`](../policy-as-code-runner/SKILL.md).

## Step 8 - Migration to Trivy

Per [tfsec-home][tfs] guidance:

```bash
# Install Trivy
brew install trivy   # or apt-get / etc.

# Trivy includes tfsec's checks under `trivy config`
trivy config ./terraform/
```

The migration is mostly mechanical - Trivy ingests the same
.tf files; rule names may differ.

## Step 9 - Combine with Checkov + KICS

Per [`iac-policy-checker`](../../agents/iac-policy-checker.md):
multiple scanners catch overlapping but non-identical issues.
tfsec is faster and Terraform-specific; Checkov is broader; KICS
adds different rule classes.

```bash
tfsec . -f json > tfsec.json
checkov -d . -o json > checkov.json
kics scan -p . --report-formats json
# iac-policy-checker agent unifies results
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Starting new tfsec adoption in 2026+ without Trivy evaluation         | Investing in deprecating path.                                            | Evaluate Trivy first (Step 8). |
| `tfsec:ignore` without justification comment                           | Skips invisible to reviewers; security debt.                              | Always include reason (Step 4 example). |
| `--minimum-severity LOW` everywhere                                    | Noise floods CI; team disables.                                           | Start `HIGH`; ratchet down. |
| Custom rules without tests                                             | Bugs in custom rules let bad config through.                             | Cross-reference with OPA-tested policies (Step 5 + Conftest). |
| Single-scanner approach                                                 | Tool-specific gaps.                                                       | Multiple scanners (Step 9). |

## Limitations

- **Terraform-only.** Doesn't scan Kubernetes / Dockerfile /
  CloudFormation directly (Trivy expands).
- **Maintenance pace slowing.** Per [tfsec-home][tfs], focus is on
  Trivy; tfsec gets bug fixes but not new features.
- **Some new cloud services lag in coverage.** Newer AWS / Azure
  resources may not have rules yet.
- **No baseline support out of the box.** Adopt against legacy
  via skip annotations or wrapper scripts.

## References

- [tfs][tfs] - tfsec overview, transition-to-Trivy positioning,
  developer-friendly output, AWS / Azure / GCP / Kubernetes /
  OpenStack / Oracle / DigitalOcean / CloudStack support, JSON /
  SARIF output.
- [`checkov-policy`](../checkov-policy/SKILL.md),
  [`kics-policy`](../kics-policy/SKILL.md) - sister scanners.
- [`policy-as-code-runner`](../policy-as-code-runner/SKILL.md) - 
  custom OPA / Rego policies (for unsupported clouds or custom
  rules).
- [`iac-policy-checker`](../../agents/iac-policy-checker.md) - 
  combines results.
