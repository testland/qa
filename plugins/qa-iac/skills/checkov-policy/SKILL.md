---
name: checkov-policy
description: "Configures Checkov for IaC security scanning across Terraform, CloudFormation, Kubernetes, Helm, ARM, Serverless, AWS CDK - installs `pip install checkov`, runs against per-framework directories, customizes rules via skip / override / custom Python checks, integrates SARIF / JUnit output for CI dashboards. Per Checkov: \"scans cloud infrastructure configurations to find misconfigurations before they're deployed.\" Use when adopting IaC security scanning against existing or legacy code: Checkov's --create-baseline / --baseline flags let CI gate only on new findings without requiring all legacy issues fixed first. Prefer over trivy-config when JUnit dashboard output or Python-based custom checks are needed."
---

# checkov-policy

## Overview

[ch]: https://www.checkov.io/

Per [checkov-home][ch], supported frameworks: Terraform and
Terraform plan, CloudFormation, Kubernetes, Helm, ARM Templates,
Serverless framework, AWS CDK. Checkov is the broadest IaC
security scanner - covers more frameworks than tfsec
(Terraform-only) or KICS (similar coverage but Checkov has more
built-in checks per release).

## When to use

- Team uses any of the supported IaC frameworks.
- Need security scanning for misconfigurations (open ports,
  unencrypted storage, overly broad IAM, etc.).
- Want one tool covering Terraform + Kubernetes + Dockerfile + CI
  pipelines.

## Step 1 - Install

```bash
pip install checkov
checkov --version
```

Per project (recommended for CI determinism):

```bash
echo 'checkov==3.2.500' >> requirements-dev.txt
pip install -r requirements-dev.txt
```

## Step 2 - Run

```bash
# Scan a directory
checkov -d .

# Scan a specific Terraform file
checkov -f main.tf

# Scan multiple frameworks
checkov -d . --framework terraform,kubernetes,dockerfile

# Scan a Terraform plan (deeper analysis)
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json
checkov -f plan.json
```

## Step 3 - Output formats

```bash
# Default (CLI)
checkov -d .

# JSON for parsing
checkov -d . -o json

# SARIF for code-scanning dashboards (GitHub Code Scanning)
checkov -d . -o sarif --output-file-path checkov.sarif

# JUnit XML for CI test reporting
checkov -d . -o junitxml > checkov.xml

# Multiple
checkov -d . -o cli -o sarif
```

## Step 4 - Skip checks

```bash
# Skip specific checks
checkov -d . --skip-check CKV_AWS_18,CKV_AWS_20

# Skip a check class
checkov -d . --skip-check CKV_AWS_*
```

In code:

```hcl
# main.tf
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs"

  # checkov:skip=CKV_AWS_20:Public read access intentional for log distribution
}
```

The `:skip=` annotation requires a justification - reviewable in
PRs.

## Step 5 - Custom Python checks

```python
# .checkov/custom_checks/cost_center_tag.py
from checkov.common.models.enums import CheckCategories, CheckResult
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class CostCenterTagPresent(BaseResourceCheck):
    def __init__(self):
        super().__init__(
            name="Ensure all EC2 instances have a cost_center tag",
            id="CKV_CUSTOM_001",
            categories=[CheckCategories.GENERAL_SECURITY],
            supported_resources=['aws_instance'],
        )

    def scan_resource_conf(self, conf):
        tags = conf.get('tags', [{}])[0]
        if 'cost_center' in tags:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = CostCenterTagPresent()
```

```bash
checkov -d . --external-checks-dir .checkov/custom_checks
```

For custom YAML policies (no Python required), use the graph-based
`policies/` directory (Checkov supports YAML rules).

## Step 6 - Soft fail / hard fail

```bash
# Default: any failed check exits non-zero (CI fails)
checkov -d .

# Soft fail: log issues but exit 0 (informational)
checkov -d . --soft-fail

# Soft fail only on specific checks
checkov -d . --soft-fail-on CKV_AWS_*
```

Pattern: hard fail on critical / new findings; soft fail on legacy
issues being ratcheted down.

## Step 7 - Baseline comparison

```bash
# Generate baseline (current state of findings)
checkov -d . --create-baseline

# Use baseline (fail only on NEW findings vs baseline)
checkov -d . --baseline .checkov.baseline
```

Baselines let teams adopt Checkov against legacy code without
fixing all existing issues at once - only new findings break the
build.

## Step 8 - CI integration

```yaml
jobs:
  iac-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - run: pip install checkov
      - name: Run Checkov
        run: checkov -d . --output sarif --output-file-path checkov.sarif --baseline .checkov.baseline
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: checkov.sarif
```

The SARIF upload to GitHub Code Scanning surfaces findings as PR
comments + the Security tab.

## Step 9 - Combine with other scanners

Checkov + tfsec + KICS catch overlapping but non-identical issues.
Combine results to a unified verdict.

```bash
checkov -d . -o json > checkov.json
tfsec . -f json > tfsec.json
kics scan -p . --report-formats json -o ./kics-results
# Combine the three reports into a unified verdict
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping all failed checks via `--skip-check`                          | Defeats security scanning.                                                | Per-check `checkov:skip=` with justification (Step 4). |
| Baseline never updated                                                  | Legacy issues never fixed; only-new gating becomes meaningless.          | Periodic baseline review + ratchet down. |
| Checkov as the only IaC scanner                                        | Tool-specific gaps; some issues missed.                                  | Pair with tfsec / KICS (Step 9). |
| Ignoring SARIF / GitHub Security tab                                    | Findings invisible until someone runs the CLI.                          | SARIF upload (Step 8). |
| Custom checks without tests                                             | Custom logic bugs let bad config through.                                | Test custom checks (per OPA's `opa test` pattern). |

## Limitations

- **Per-framework rule depth varies.** Terraform / Kubernetes have
  hundreds of rules; ARM / Serverless have fewer.
- **False positives common in early adoption.** Use baseline to
  manage.
- **Performance on large repos.** Checkov scans whole-tree; can take
  minutes.
- **Built-in rules may not match team policy.** Custom checks for
  team-specific rules (Step 5).

## References

- [ch][ch] - Checkov overview, supported IaC frameworks, common
  CLI usage, Palo Alto Networks maintainer.
- `tfsec-policy`,
  `kics-policy` - sister scanners.
- `policy-as-code-runner` - 
  custom policies via OPA / Conftest (Checkov for built-in; OPA
  for custom).
