---
name: grype-scanning
description: "Scans for vulnerabilities using Anchore Grype: `grype sbom:./sbom.json` / `grype {image}` / `grype dir:./` across OS-package + language-package ecosystems (Alpine / Debian / Ubuntu / RHEL / Amazon Linux / Ruby / Java / JavaScript / Python / .NET / Go / PHP / Rust). `.grype.yaml` per-CVE and per-package ignore rules with mandatory `expires:` dates and reachability justification (the Grype-native suppression path, distinct from standalone VEX document authoring in vex-author); EPSS + KEV + risk-score prioritization; OpenVEX assertion filtering; `--fail-on high/critical` CI gate. Use when the team wants Grype-native vuln scanning, or pairs with Syft (syft-generation) for an SBOM-driven workflow."
---

# grype-scanning

## Overview

Per [github.com/anchore/grype][gr-gh]:

[gr-gh]: https://github.com/anchore/grype

Grype is the Anchore vuln scanner that pairs with `syft-generation`.
Three input modes:

| Input mode | Use |
|---|---|
| Container image | `grype alpine:latest` (Grype generates SBOM internally) |
| Directory | `grype ./my-project` (filesystem scan) |
| SBOM input | `grype sbom:./sbom.json` (no re-generation; faster + auditable) |

The SBOM-input mode is the recommended pattern for production:
generate the SBOM once via Syft, attest via cosign, then scan
the SBOM via Grype. Decoupling the two steps gives audit trail
+ allows re-scanning with refreshed vuln DB without re-building.

Per [gr-gh][gr-gh] coverage:

> "Supports major OS package ecosystems (Alpine, Debian, Ubuntu,
> RHEL, Amazon Linux, etc.). Covers language-specific packages
> (Ruby, Java, JavaScript, Python, .NET, Go, PHP, Rust). Supports
> Docker, OCI, and Singularity image formats."

## When to use

- The team uses Syft for SBOM generation + needs paired vuln
  scanning.
- Container-image vuln scanning where Trivy isn't already in
  place.
- Language-package vuln coverage layered with `osv-scanner`
  + `snyk-test` (in the qa-sca plugin) for
  cross-DB consensus.
- OpenVEX-based finding filtering (status assertions like "not
  affected" / "fixed" / "under-investigation" filter scan output).

## How to use

1. Install Grype (Step 1).
2. Generate an SBOM once with Syft, then scan the SBOM:
   `grype sbom:./sbom.json` - deterministic + auditable (Step 2).
3. Pick the output format for the consumer: `-o sarif` for GitHub
   Code Scanning, `-o json` for prioritization (Step 3).
4. Gate CI with `--fail-on high`; add `--only-fixed` to focus on
   actionable findings (Step 4).
5. Triage false positives into `.grype.yaml` ignore rules, each with
   a mandatory `expires:` date + reachability reason (Step 5).
6. Pin the vuln DB for CI determinism (`grype db import ...`) (Step 6).
7. Wire `anchore/scan-action` + SARIF upload into the pipeline (Step 7).

## Step 1 - Install

Per [gr-gh][gr-gh]:

```bash
curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin
```

Other install paths (verify against [gr-gh][gr-gh]): brew install
grype; Docker image `anchore/grype`.

## Step 2 - Basic scans

Per [gr-gh][gr-gh]:

```bash
# Container image (Grype generates internal SBOM)
grype alpine:latest

# Directory
grype ./my-project

# SBOM input (recommended for audit trail)
grype sbom:./sbom.json

# Pipe-in pattern
cat ./sbom.json | grype
```

The SBOM-input mode skips re-generation; the scan output is
deterministic given the same SBOM + vuln DB version.

## Step 3 - Output formats

Per [gr-gh][gr-gh]: "support for multiple output formats (table,
json, cyclonedx, sarif, template)".

Verify exact CLI flag against current Grype release; typical:

```bash
grype my-image:1.0 -o table          # default human-readable
grype my-image:1.0 -o json           # JSON for vuln prioritization
grype my-image:1.0 -o sarif          # SARIF for GitHub Code Scanning
grype my-image:1.0 -o cyclonedx-json # CycloneDX with vuln annotations
grype my-image:1.0 -o template -t my-template.tmpl   # custom Go template
```

Per [gr-gh][gr-gh]: includes "threat prioritization with EPSS,
KEV, and risk scoring" - the JSON output annotates each finding
with these signals for downstream prioritization.

## Step 4 - Severity filtering + fail-on

Per [gr-gh][gr-gh]:

```bash
# Filter to HIGH+CRITICAL only
grype my-image --fail-on high

# Common severity levels: critical, high, medium, low, negligible, unknown
```

`--fail-on` controls CI exit code - exit 1 if any finding meets or
exceeds the severity. Pair with `--only-fixed` to focus on
upgradable findings:

```bash
grype my-image --fail-on high --only-fixed
```

## Step 5 - Suppression + false-positive triage (MANDATORY)

Grype's native suppression path is `.grype.yaml` ignore rules -
per-CVE, per-package+version, or pattern-based (`fix-state`), each
carrying a **mandatory `expires:` date** and a reachability `reason:`.
The full `.grype.yaml` example config and the required justification
template are in
[references/grype-ignore-rules.md](references/grype-ignore-rules.md).

Suppression mechanisms (per [gr-gh][gr-gh] + standard practice):

| Mechanism | Use |
|---|---|
| `.grype.yaml` ignore (with `expires:`) | Per-CVE / per-package / pattern-based |
| OpenVEX status assertions | Per-finding status (`not_affected` / `affected` / `fixed` / `under_investigation`) |
| `--only-fixed` flag | Filter to findings with available fixes (skip "stuck" findings) |
| `--fail-on <severity>` filter | Threshold for CI gate |

OpenVEX is a particularly clean way to manage findings - the VEX
document is signed + persistent + machine-readable; consumers can
verify supply-chain assertions about vulnerability status.

Cadence: every quarter, audit `.grype.yaml` ignore entries; expired
`re-review-date` entries removed.

## Step 6 - DB management

Grype's vuln DB updates frequently (multiple times per day):

```bash
# Manually refresh DB
grype db update

# Show DB status
grype db status

# Use a specific cached DB version (CI determinism)
grype db import grype-db-v6-2026-05-06.tar.gz
```

For CI determinism, pin DB version per scan; otherwise Grype
pulls the latest.

## Step 7 - CI integration

```yaml
jobs:
  grype:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/download-artifact@v4
        with: { name: sboms }
      - uses: anchore/scan-action@v5
        with:
          sbom: sbom.cyclonedx.json
          fail-build: true
          severity-cutoff: high
          output-format: sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: results.sarif }
```

The `anchore/scan-action` GHA wraps Grype + handles SARIF upload.

## Step 8 - Composition with sister tools

| Sister tool | Use |
|---|---|
| `syft-generation` | Generates the SBOM Grype scans |
| `trivy-image` | Alternative all-in-one (SBOM gen + scan) |
| `osv-scanner` | Cross-plugin alternative for OSV.dev DB |

## Worked example

A CI job scans a previously generated SBOM and gates on HIGH:

1. `grype sbom:./sbom.cyclonedx.json --fail-on high --only-fixed`
   returns exit 1 - one HIGH finding, `CVE-2024-1234` on
   `lodash@4.17.20`, has an available fix.
2. Reachability analysis shows the vulnerable function is only used
   by test fixtures, not production paths. The team adds a per-package
   ignore to `.grype.yaml` with `reason:`, `approved-by:`, and
   `expires: 2026-09-15` (see
   [references/grype-ignore-rules.md](references/grype-ignore-rules.md)).
3. Re-running `grype sbom:./sbom.cyclonedx.json --fail-on high`
   now exits 0 - the triaged finding is suppressed until the expiry.
4. The pipeline also emits `-o sarif` and uploads it via
   `github/codeql-action/upload-sarif` so the finding history stays
   visible in GitHub Code Scanning.

Result: the build passes with one documented, time-boxed suppression
and a SARIF audit trail, instead of a blanket severity downgrade.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Re-generate SBOM via Grype on every scan | Slow + non-deterministic; SBOM lives outside scan | Use `sbom:` input mode (Step 2) |
| `.grype.yaml` ignore without `expires:` | Permanent debt | Mandatory `expires:` (Step 5) |
| Skip `--only-fixed` filter | Stuck findings (no fix available) flood the report | Add `--only-fixed` for actionable filter (Step 4) |
| Use `--fail-on critical` only | Misses HIGH severity issues | Threshold `--fail-on high` typical (Step 4) |
| Skip Grype DB pin in CI | Different DB version per CI run; non-deterministic | Pin DB version (Step 6) |

## Limitations

- Grype's DB is Anchore-curated; coverage differs from OSV.dev,
  Snyk, NVD; pair with another scanner for consensus.
- Container-only secret scanning is limited; use `trivy-image`
  + `gitleaks-scanning` (in the qa-secrets plugin)
  for that.
- License-detection support is basic; for compliance, pair with
  ScanCode / FOSSology.
- Reachability analysis NOT included - every CVE on a declared
  component counts.

## References

- [gr-gh][gr-gh] - repository, install, basic commands
- [references/grype-ignore-rules.md](references/grype-ignore-rules.md) - `.grype.yaml` config + justification template
- oss.anchore.com/docs/reference/grype/cli/ - full CLI reference
- openvex.dev - OpenVEX specification
- first.org/epss - EPSS data source for prioritization
- `syft-generation`,
  `cyclonedx-format`,
  `spdx-format`,
  `trivy-image` - sister tools
