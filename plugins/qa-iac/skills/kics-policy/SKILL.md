---
name: kics-policy
description: "Configures KICS (Keeping Infrastructure as Code Secure), Checkmarx's scanner covering Terraform, Kubernetes, Helm, Dockerfile, OpenAPI, Ansible, ARM, CloudFormation, Pulumi, Crossplane - CLI / Docker / GitHub Action / pre-commit, JSON / SARIF / HTML / JUnit output, custom Rego queries. Use for the widest platform breadth, especially OpenAPI / Pulumi / Crossplane; for the broadest built-in checks with Python custom rules use checkov-policy, for Terraform-only scanning use tfsec-policy, and for a consolidated scanner use trivy-config."
---

# kics-policy

## Overview

KICS (Keeping Infrastructure as Code Secure) is Checkmarx's IaC scanner.
Its distinctive strengths vs sister scanners:
- OpenAPI scanning (uncommon in other IaC scanners).
- Pulumi + Crossplane support (Checkov has Pulumi too; KICS broader).
- Lightweight Docker image; portable in restricted CI.

## When to use

- Need OpenAPI security scanning (security misconfigs in API specs).
- Pulumi / Crossplane stack.
- Want a third opinion alongside Checkov + tfsec (different rules
  catch different things).

## Step 1 - Install

Docker is the primary install path per the [KICS getting-started
docs][kgs]; there is no install script.

[kgs]: https://docs.kics.io/latest/getting-started/

```bash
docker pull checkmarx/kics:latest
```

For a version-pinned binary install, see the Pinned versions +
binary-install section in [references/kics-policy.md](references/kics-policy.md).

## Step 2 - Run

```bash
# Scan a directory (Docker)
docker run -v "$PWD:/path" checkmarx/kics scan -p /path --output-path /path/results

# Or via binary
kics scan -p . --output-path ./kics-results

# Specific platform
kics scan -p . -t terraform,kubernetes
```

## Step 3 - Output formats

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

## Step 4 - Severity threshold

```bash
# Fail only on HIGH+
kics scan -p . --fail-on high,critical

# Don't fail; just report
kics scan -p . --no-progress --silent
```

## Step 5 - Skip checks

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

## Step 6 - Custom queries (Rego)

KICS queries are written in Rego (same as OPA). Point KICS at a query
directory with `-q`:

```bash
kics scan -p . -q ./custom-queries/
```

For a full query template (`package Cx` + `CxPolicy[result]`), see
[references/kics-policy.md](references/kics-policy.md).

## Step 7 - CI integration

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

## Step 8 - OpenAPI scanning

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

## Step 9 - Pulumi / Crossplane

```bash
kics scan -p ./pulumi-project/ -t pulumi
kics scan -p ./crossplane-config/ -t crossplane
```

For Pulumi shops, KICS provides scanning that Checkov / tfsec
don't.

## Anti-patterns

See the anti-patterns table in
[references/kics-policy.md](references/kics-policy.md) - covers KICS as
the only scanner, unjustified `ignore-line`, skipping `--fail-on` in CI,
full-output noise, and untested custom queries.

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
- `checkov-policy`,
  `tfsec-policy` - sister scanners.
- `policy-as-code-runner` - 
  custom OPA / Rego.
