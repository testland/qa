---
name: grype-scanning
description: Scans for vulnerabilities using Anchore Grype — SBOM-aware scanner with `grype <image>`, `grype dir:./`, `grype sbom:./sbom.json` invocations; covers OS-package + language-package ecosystems (Alpine / Debian / Ubuntu / RHEL / Amazon Linux / Ruby / Java / JavaScript / Python / .NET / Go / PHP / Rust); includes EPSS + KEV + risk-score prioritization; OpenVEX support for filtering; `.grype.yaml` ignore rules with expiration. Use when the team wants Grype-native vuln scanning (or pairs with Syft for SBOM-driven workflow).
rating: 23
d6: 4
archetype: S1
---

# grype-scanning

## Overview

Per [github.com/anchore/grype][gr-gh]:

[gr-gh]: https://github.com/anchore/grype

Grype is the Anchore vuln scanner that pairs with [`syft-generation`](../syft-generation/SKILL.md).
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
- Language-package vuln coverage layered with [`osv-scanner`](../../qa-sca/skills/osv-scanner/SKILL.md)
  + [`snyk-test`](../../qa-sca/skills/snyk-test/SKILL.md) for
  cross-DB consensus.
- OpenVEX-based finding filtering (status assertions like "not
  affected" / "fixed" / "under-investigation" filter scan output).

## Step 1 — Install

Per [gr-gh][gr-gh]:

```bash
curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin
```

Other install paths (verify against [gr-gh][gr-gh]): brew install
grype; Docker image `anchore/grype`.

## Step 2 — Basic scans

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

## Step 3 — Output formats

Per [gr-gh][gr-gh]: "support for multiple output formats (table,
json, cyclonedx, sarif, template)".

Verify exact CLI flag against current Grype release; typical:

```bash
grype my-image:1.0 -o table          # default human-readable
grype my-image:1.0 -o json           # JSON for vuln-prioritizer
grype my-image:1.0 -o sarif          # SARIF for GitHub Code Scanning
grype my-image:1.0 -o cyclonedx-json # CycloneDX with vuln annotations
grype my-image:1.0 -o template -t my-template.tmpl   # custom Go template
```

Per [gr-gh][gr-gh]: includes "threat prioritization with EPSS,
KEV, and risk scoring" — the JSON output annotates each finding
with these signals for downstream prioritization (see
[`vuln-prioritizer`](../../agents/vuln-prioritizer.md)).

## Step 4 — Severity filtering + fail-on

Per [gr-gh][gr-gh]:

```bash
# Filter to HIGH+CRITICAL only
grype my-image --fail-on high

# Common severity levels: critical, high, medium, low, negligible, unknown
```

`--fail-on` controls CI exit code — exit 1 if any finding meets or
exceeds the severity. Pair with `--only-fixed` to focus on
upgradable findings:

```bash
grype my-image --fail-on high --only-fixed
```

## Step 5 — `.grype.yaml` ignore rules

Per [gr-gh][gr-gh]: "Configuration can be managed through
`.grype.yaml` files with ignore rules for customized scanning
behavior."

Example config:

```yaml
# .grype.yaml
ignore:
  # Per-CVE ignore
  - vulnerability: CVE-2024-1234
    reason: "Reachability analysis confirms unreachable; tracked in JIRA-1234"
    expires: 2026-12-15

  # Per-package + version ignore
  - package:
      name: lodash
      version: 4.17.20
    vulnerability: CVE-2024-5678
    reason: "Test fixture; not in production dependency graph"
    expires: 2026-09-30

  # Pattern-based ignore (per-fix-state)
  - vulnerability: GHSA-*
    fix-state: not-fixed
    reason: "Pending vendor fix; not exploitable in our context"
    expires: 2026-12-15
```

## Step 6 — False-positive triage (MANDATORY)

Suppression mechanisms (per [gr-gh][gr-gh] + standard practice):

| Mechanism | Use |
|---|---|
| `.grype.yaml` ignore (with `expires:`) | Per-CVE / per-package / pattern-based |
| OpenVEX status assertions | Per-finding status (`not_affected` / `affected` / `fixed` / `under_investigation`) |
| `--only-fixed` flag | Filter to findings with available fixes (skip "stuck" findings) |
| `--fail-on <severity>` filter | Threshold for CI gate |

OpenVEX is a particularly clean way to manage findings — the VEX
document is signed + persistent + machine-readable; consumers can
verify supply-chain assertions about vulnerability status.

**Justification template (mandatory in `.grype.yaml`):**

```yaml
ignore:
  - vulnerability: CVE-2024-1234
    reason: |
      Reachability: vulnerable function `parse_xml` not called from
      production code paths (verified via static analysis 2026-05-15).
      Component is required for test fixtures only.
    approved-by: alice@example.com
    expires: 2026-09-15
    re-review-date: 2026-09-15
```

Cadence: every quarter, audit `.grype.yaml` ignore entries; expired
re-review-date entries removed.

## Step 7 — DB management

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

## Step 8 — CI integration

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

## Step 9 — Composition with sister tools

| Sister tool | Use |
|---|---|
| [`syft-generation`](../syft-generation/SKILL.md) | Generates the SBOM Grype scans |
| [`trivy-image`](../trivy-image/SKILL.md) | Alternative all-in-one (SBOM gen + scan) |
| [`vuln-prioritizer`](../../agents/vuln-prioritizer.md) | Unifies Grype + Trivy + Snyk findings |
| [`osv-scanner`](../../qa-sca/skills/osv-scanner/SKILL.md) | Cross-plugin alternative for OSV.dev DB |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Re-generate SBOM via Grype on every scan | Slow + non-deterministic; SBOM lives outside scan | Use `sbom:` input mode (Step 2) |
| `.grype.yaml` ignore without `expires:` | Permanent debt | Mandatory `expires:` (Step 5) |
| Skip `--only-fixed` filter | Stuck findings (no fix available) flood the report | Add `--only-fixed` for actionable filter (Step 4) |
| Use `--fail-on critical` only | Misses HIGH severity issues | Threshold `--fail-on high` typical (Step 4) |
| Skip Grype DB pin in CI | Different DB version per CI run; non-deterministic | Pin DB version (Step 7) |

## Limitations

- Grype's DB is Anchore-curated; coverage differs from OSV.dev,
  Snyk, NVD; pair with another scanner for consensus.
- Container-only secret scanning is limited; use [`trivy-image`](../trivy-image/SKILL.md)
  + [`gitleaks-scanning`](../../qa-secrets/skills/gitleaks-scanning/SKILL.md)
  for that.
- License-detection support is basic; for compliance, pair with
  ScanCode / FOSSology.
- Reachability analysis NOT included — every CVE on a declared
  component counts.

## References

- [gr-gh][gr-gh] — repository, install, basic commands
- oss.anchore.com/docs/reference/grype/cli/ — full CLI reference
- openvex.dev — OpenVEX specification
- first.org/epss — EPSS data source for prioritization
- [`syft-generation`](../syft-generation/SKILL.md),
  [`cyclonedx-format`](../cyclonedx-format/SKILL.md),
  [`spdx-format`](../spdx-format/SKILL.md),
  [`trivy-image`](../trivy-image/SKILL.md) — sister tools
- [`vuln-prioritizer`](../../agents/vuln-prioritizer.md) — unifier agent
- [`sca-prioritizer`](../../qa-sca/agents/sca-prioritizer.md) —
  cross-plugin sibling for SCA findings (similar prioritization
  logic)
