---
name: trivy-config
description: "Runs Trivy's misconfiguration scanner (`trivy config`) against IaC directories to detect security issues across Terraform, CloudFormation, Kubernetes manifests, Helm charts, Dockerfiles, and Azure ARM templates - installs Trivy, scans with severity gating via `--exit-code`, suppresses findings via `.trivyignore` / `.trivyignore.yaml` or inline annotations, extends built-in checks with custom Rego policies, and emits SARIF for GitHub Code Scanning. Trivy is the forward path from tfsec (per Aqua Security's own migration guidance). Use when adopting a consolidated IaC scanner for new projects, migrating away from tfsec, or scanning mixed IaC stacks with a single tool."
keywords: [trivy, iac, misconfiguration, terraform, kubernetes, dockerfile, helm, cloudformation, rego, sarif, security]
---

# trivy-config

## Overview

[mc]: https://trivy.dev/latest/docs/scanner/misconfiguration/
[cli]: https://trivy.dev/latest/docs/references/configuration/cli/trivy_config/
[custom]: https://trivy.dev/latest/docs/scanner/misconfiguration/custom/
[filter]: https://trivy.dev/latest/docs/configuration/filtering/
[report]: https://trivy.dev/latest/docs/configuration/reporting/
[checks]: https://github.com/aquasecurity/trivy-checks
[tfsec]: ../tfsec-policy/SKILL.md

Per [trivy.dev misconfiguration docs][mc]:

> "Trivy provides built-in checks to detect configuration issues in
> popular Infrastructure as Code files, such as: Docker, Kubernetes,
> Terraform, CloudFormation, and more."

Trivy is Aqua Security's consolidated scanner and the forward path from
tfsec. Per the [tfsec skill][tfsec] and Aqua's own documentation, new
projects should evaluate Trivy first; tfsec's checks ship inside Trivy
under `trivy config`.

## Step 1 - Install

Per [trivy.dev][mc] (v0.71.0 is the latest release as of 2026-06-04):

```bash
# macOS
brew install trivy

# Debian / Ubuntu
sudo apt-get install wget apt-transport-https gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key \
  | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \
  https://aquasecurity.github.io/trivy-repo/deb generic main" \
  | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt-get update && sudo apt-get install trivy

# RPM (RHEL / Fedora)
sudo rpm -ivh https://github.com/aquasecurity/trivy/releases/latest/download/trivy_Linux-64bit.rpm

# Docker (no local install)
docker run --rm -v $(pwd):/workspace aquasec/trivy config /workspace
```

Verify: `trivy --version`.

## Step 2 - First scan

Per [cli reference][cli], `trivy config` accepts a path (file or
directory). Trivy auto-detects IaC types - Terraform, CloudFormation,
Kubernetes manifests, Helm charts, Dockerfiles, and Azure ARM templates
can all coexist in the same directory per [mc docs][mc]:

> "The specified directory can contain mixed types of IaC files.
> Trivy automatically detects config types and applies relevant checks."

```bash
# Scan the current directory (all IaC types)
trivy config .

# Scan a specific subdirectory
trivy config ./infra/

# Show only HIGH and CRITICAL findings
trivy config --severity HIGH,CRITICAL .

# Fail CI when any finding is found (exit code 1)
trivy config --exit-code 1 --severity HIGH,CRITICAL .

# Include passed checks alongside failures
trivy config --include-non-failures .
```

Built-in checks are distributed as an OPA bundle at
`ghcr.io/aquasecurity/trivy-checks` (per [checks repo][checks]).
Trivy caches the bundle locally and refreshes every 24 hours. An
embedded fallback is included in the binary for air-gapped environments.

## Step 3 - Severity gating

Per [cli reference][cli], `--exit-code` and `--severity` are the two
levers for CI gating:

| Flag | Purpose | Example |
|------|---------|---------|
| `--exit-code int` | Exit code when findings match | `--exit-code 1` |
| `--severity strings` | Comma-separated severity filter | `HIGH,CRITICAL` |

Pattern: gate hard on `CRITICAL` first; expand to `HIGH` after the
team has reviewed the initial finding set.

```bash
# Hard fail on CRITICAL only (bootstrap phase)
trivy config --exit-code 1 --severity CRITICAL .

# Ratchet: add HIGH once existing findings are triaged
trivy config --exit-code 1 --severity HIGH,CRITICAL .
```

## Step 4 - Output formats

Per [trivy.dev reporting docs][report], `--format` accepts:

| Value | Use case |
|-------|---------|
| `table` (default) | Human-readable terminal output |
| `json` | Machine-parseable; pipe to `jq` |
| `sarif` | GitHub Code Scanning / SARIF 2.1.0 |
| `template` | Custom templates (JUnit, ASFF, HTML via `contrib/`) |

```bash
# JSON for parsing / badge generation
trivy config --format json --output trivy.json .

# SARIF for GitHub Code Scanning
trivy config --format sarif --output trivy.sarif .

# JUnit XML for CI test reporting
trivy config --format template \
  --template "@contrib/junit.tpl" \
  --output trivy-junit.xml .
```

## Step 5 - Suppressing findings

Per [trivy.dev filtering docs][filter]:

### .trivyignore (check-ID list)

```
# .trivyignore
# Suppress a specific misconfig check
AVD-DS-0002

# Suppress a CVE alongside a misconfig in the same file
CVE-2018-14618
```

### .trivyignore.yaml (structured suppression)

Per [filter docs][filter], the YAML variant supports scoped expiring
suppressions:

```yaml
# .trivyignore.yaml
misconfigurations:
  - id: AVD-DS-0001
  - id: AVD-DS-0002
    paths:
      - "infra/legacy/Dockerfile"
    statement: "Legacy image; migration tracked in JIRA-4321"
    expired_at: "2026-12-31"
```

Run with: `trivy config --ignorefile ./.trivyignore.yaml .`

Per [cli reference][cli], `--ignorefile` defaults to `.trivyignore` and
accepts an alternate path.

### Rego-based ignore policy

Per [filter docs][filter], pass `--ignore-policy` with a Rego file that
contains a `trivy` package and an `ignore` rule:

```rego
# ignore_legacy.rego
package trivy

default ignore = false

ignore {
    input.Type == "terraform"
    input.Namespace == "user.legacy"
}
```

```bash
trivy config --ignore-policy ignore_legacy.rego .
```

## Step 6 - Custom Rego policies

Per [trivy.dev custom checks docs][custom], pass custom policies with
`--config-check` and scope them with `--namespaces`:

```bash
trivy config \
  --config-check ./policies/ \
  --namespaces user \
  ./infra/
```

Per [custom docs][custom], each policy file requires a unique package
declaration and a METADATA annotation block:

```rego
# policies/require_cost_center_tag.rego
# METADATA
# title: "EC2 instances must have cost_center tag"
# description: "Untagged resources cannot be allocated to cost centers"
# schemas:
#   - input: schema["cloud"]
# custom:
#   id: USER-TF-001
#   severity: HIGH
#   input:
#     selector:
#       - type: cloud

package user.terraform.USER-TF-001

import rego.v1

deny contains res if {
    instance := input.aws.ec2.instances[_]
    not instance.tags["cost_center"]
    res := result.new(
        sprintf("EC2 instance '%s' missing cost_center tag", [instance.id.value]),
        instance,
    )
}
```

Per [custom docs][custom], the `--namespaces` value (here: `user`) must
match the first segment of the package path. Supported `input.selector`
types include `cloud` (Terraform / CloudFormation), `kubernetes`,
`dockerfile`, `yaml`, `json`, `toml`, and `terraform-raw`.

## Step 7 - CI integration (GitHub Actions)

Per [trivy.dev reporting docs][report], SARIF output integrates directly
with GitHub Code Scanning:

```yaml
# .github/workflows/trivy-iac.yml
jobs:
  trivy-config:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v5

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@0.31.0
        with:
          scan-type: config
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: 1
          format: sarif
          output: trivy.sarif
          ignore-unfixed: true

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy.sarif
```

The `if: always()` on the upload step ensures findings appear in the
Security tab even when the scan step exits non-zero.

To scope the scan to a single IaC type, pass `--misconfig-scanners` per
[cli reference][cli]:

```bash
# Terraform only
trivy config \
  --misconfig-scanners terraform \
  ./terraform/

# Kubernetes manifests only
trivy config \
  --misconfig-scanners kubernetes \
  ./k8s/
```

Per [cli reference][cli], `--misconfig-scanners` accepts a
comma-separated list from: `azure-arm`, `cloudformation`, `dockerfile`,
`helm`, `kubernetes`, `terraform`, `terraformplan-json`,
`terraformplan-snapshot`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `--exit-code 0` in CI | Misconfigs are logged but never block | Use `--exit-code 1` with `--severity HIGH,CRITICAL` (Step 3) |
| `.trivyignore` entries without a `statement` | Invisible to reviewers; silent security debt | Use `.trivyignore.yaml` with `statement` + `expired_at` (Step 5) |
| Running `trivy config` and `tfsec` in parallel without a unifier | Duplicate findings flood CI output | Route both through a single unifying reporter |
| Custom policies missing METADATA block | No severity, no title in report output | Always include METADATA with `id`, `severity`, `schemas` (Step 6) |
| Skipping bundle updates (`--skip-check-update`) permanently | Stale checks miss new misconfig rules | Use for caching in CI; re-enable updates on a scheduled run |

## Limitations

- **Network required on first run.** Trivy downloads the checks bundle
  from `ghcr.io/aquasecurity/trivy-checks`. Air-gapped setups need the
  embedded binary fallback or a mirror.
- **Terraform variable resolution is partial.** Dynamic values computed
  at apply time may cause false positives; pass `--tf-vars` to reduce
  noise per [cli reference][cli].
- **Helm rendering requires chart values.** Pass `--helm-values` for
  accurate rendering of templated manifests per [cli reference][cli].
- **Custom policy schemas must match input type.** A policy with
  `schema["cloud"]` will not fire against Kubernetes manifests; use the
  correct selector type per [custom docs][custom].

## References

- [mc][mc] - Trivy misconfiguration scanner overview, supported IaC
  types, auto-detection behavior, air-gap fallback, network requirements.
- [cli][cli] - `trivy config` CLI reference: `--exit-code`,
  `--severity`, `--format`, `--output`, `--ignorefile`,
  `--config-check`, `--namespaces`, `--misconfig-scanners`,
  `--tf-vars`, `--helm-values`, `--cf-params`, `--include-non-failures`.
- [custom][custom] - Custom Rego policy authoring: METADATA fields
  (`title`, `description`, `schemas`, `custom.id`, `custom.severity`,
  `custom.input.selector.type`), `deny` rule pattern, `--namespaces`
  scoping.
- [filter][filter] - `.trivyignore` and `.trivyignore.yaml` suppression
  format (`id`, `paths`, `statement`, `expired_at`), `--ignore-policy`
  Rego-based filtering.
- [report][report] - Output formats: `table`, `json`, `sarif`,
  `template`; `--output` flag; SARIF 2.1.0 compliance.
- [checks][checks] - `aquasecurity/trivy-checks` - the upstream
  OPA bundle for all built-in checks.
- [`tfsec-policy`][tfsec] - Migration context: tfsec is transitioning
  to Trivy; this skill is the forward path.
- [`checkov-policy`](../checkov-policy/SKILL.md) - Sister scanner;
  broader Python-check framework, different rule coverage.
