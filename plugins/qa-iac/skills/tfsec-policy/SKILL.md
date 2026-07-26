---
name: tfsec-policy
description: "Configures tfsec for Terraform-specific security scanning - covers AWS / Azure / GCP / Kubernetes / OpenStack / Oracle / DigitalOcean / CloudStack, custom YAML rules, and SARIF / JUnit / Markdown output. Note: tfsec is transitioning to Trivy per Aqua Security, so new projects evaluate that first. Use for an existing Terraform-only tfsec stack; for the consolidated forward-path scanner use trivy-config, for the broadest multi-framework checks use checkov-policy, and for wider platform breadth use kics-policy."
---

# tfsec-policy

## Overview

[tfs]: https://aquasecurity.github.io/tfsec/v1.28.13/

Per [tfsec-home][tfs], tfsec is transitioning to Trivy, Aqua
Security's consolidated scanner. For new projects, evaluate Trivy
first; tfsec remains stable for existing usage.

## When to use

- Existing tfsec project; team isn't ready to migrate to Trivy.
- Terraform-only stack; want a focused Terraform-specific
  scanner.
- A specific tfsec rule covers something Trivy doesn't yet.

## How to use

1. Install tfsec via Homebrew or the release binary (Step 1).
2. Run `tfsec .` against the Terraform tree, starting at
   `--minimum-severity HIGH` to keep the signal high (Step 2).
3. Emit SARIF for GitHub Code Scanning, or JUnit / Markdown for CI
   and PR comments (Step 3).
4. Triage findings - fix real issues, annotate intentional
   exceptions with justified `tfsec:ignore:` comments (Step 4).
5. Verify: re-run `tfsec . --minimum-severity HIGH` after
   remediation and assert it reports no HIGH findings before
   merging; if any remain, fix or justify-ignore them and re-run.
6. Add custom YAML rules for team-specific policy, then wire the
   scan into CI (Steps 5-6).
7. Confirm cloud coverage; fall back to OPA / Conftest for
   unsupported clouds (Step 7).
8. Plan the Trivy migration for new work, and combine with Checkov
   / KICS for overlapping coverage (Steps 8-9).

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

Author custom YAML rules for team-specific policy the built-in set
misses:
[references/custom-rules-and-ci.md](references/custom-rules-and-ci.md).

## Step 6 - CI integration

Run the official tfsec action with SARIF upload to GitHub Code
Scanning:
[references/custom-rules-and-ci.md](references/custom-rules-and-ci.md).

## Step 7 - Supported clouds

Per [tfsec-home][tfs], tfsec covers AWS (S3, EC2, RDS, IAM, Lambda,
API Gateway, and 30+ services), Azure (App Service, Storage,
Database, Container, Key Vault), Google Cloud (Compute, GKE, SQL,
Storage, IAM, BigQuery), plus Kubernetes, OpenStack, Oracle,
DigitalOcean, and CloudStack.

For unsupported clouds, fall back to OPA / Conftest with custom
Rego per `policy-as-code-runner`.

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

Multiple scanners catch overlapping but non-identical issues.
tfsec is faster and Terraform-specific; Checkov is broader; KICS
adds different rule classes.

```bash
tfsec . -f json > tfsec.json
checkov -d . -o json > checkov.json
kics scan -p . --report-formats json
# unify results across the three scanners
```

## Worked example

A team runs tfsec on an AWS Terraform module while planning a Trivy
migration.

1. `brew install tfsec`, then `tfsec ./terraform/ --minimum-severity
   HIGH` to focus on the worst findings first.
2. tfsec flags an unencrypted S3 bucket
   (`aws-s3-enable-bucket-encryption`) as HIGH.
3. The bucket is a public dataset by design, so the author adds
   `# tfsec:ignore:aws-s3-enable-bucket-encryption Public dataset,
   not encrypted by design` inline.
4. CI runs `aquasecurity/tfsec-action@v1.0.3` with `format: sarif`;
   the SARIF upload posts remaining findings to the Security tab.
5. Ahead of the switch they dry-run `trivy config ./terraform/` and
   confirm the same `.tf` files scan under Trivy.

Result: HIGH-severity misconfigurations gate the build, intentional
exceptions are documented inline, and the Trivy forward-path is
validated before switching.

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
- **Maintenance pace slowing.** Per [tfsec-home][tfs], tfsec gets
  bug fixes but not new features.
- **Some new cloud services lag in coverage.** Newer AWS / Azure
  resources may not have rules yet.
- **No baseline support out of the box.** Adopt against legacy
  via skip annotations or wrapper scripts.

## References

- [tfs][tfs] - tfsec overview, transition-to-Trivy positioning,
  developer-friendly output, AWS / Azure / GCP / Kubernetes /
  OpenStack / Oracle / DigitalOcean / CloudStack support, JSON /
  SARIF output.
- `checkov-policy`,
  `kics-policy` - sister scanners.
- `policy-as-code-runner` - 
  custom OPA / Rego policies (for unsupported clouds or custom
  rules).
