---
name: osv-scanner
description: "Configures and runs Google OSV-Scanner - open-source SCA against the OSV.dev vulnerability database; supports `osv-scanner scan -r ./` recursive scan + per-lockfile scan via `-L package-lock.json`; SBOM input (CycloneDX / SPDX) for non-standard package managers; `--format json|sarif|markdown|vertical|html` output; suppressions via `osv-scanner.toml` config. Use when the team needs OSS-native SCA without commercial-license overhead, or wants a second-opinion DB pair with Snyk's commercial DB."
---

# osv-scanner

[osv-usage]: https://google.github.io/osv-scanner/usage/

## When to use

- Team prefers OSS tooling over commercial Snyk.
- Layered SCA strategy - pair with [`snyk-test`](../snyk-test/SKILL.md)
  for cross-DB consensus signal.
- Custom package manager produces SBOMs not natively supported;
  feed SBOM directly to OSV-Scanner.
- Lightweight CI gate without commercial-license setup.

## Step 1 - Install

Per [osv-usage][osv-usage]:

```bash
docker pull ghcr.io/google/osv-scanner:latest
```

Other install paths (consult google.github.io/osv-scanner for
current options per platform):

```bash
# Go install
go install github.com/google/osv-scanner/cmd/osv-scanner@v1

# Homebrew
brew install osv-scanner

# Direct binary download from github.com/google/osv-scanner/releases
```

## Step 2 - Basic recursive scan

Per [osv-usage][osv-usage]:

```bash
osv-scanner scan -r ./my-project-dir/
```

Auto-detects manifest files (package-lock.json, Pipfile.lock,
go.mod, Cargo.lock, etc.) and queries OSV.dev for each.

Per-lockfile scan:

```bash
osv-scanner scan -L package-lock.json --output-file scan-results.txt
```

The `-L` flag is useful in monorepos to scan a specific lockfile
without recursing.

## Step 3 - Output formats

Per [osv-usage][osv-usage]: `--format json` and `--format=vertical`
and `--format=html` are referenced. Full format list per the
osv-scanner documentation:

| Format | Use |
|---|---|
| `--format json` | For downstream aggregation |
| `--format sarif` | GitHub Code Scanning upload |
| `--format markdown` | PR comments |
| `--format vertical` | Default human-readable |
| `--format html` | Standalone report |

## Step 4 - SBOM-driven scanning

For projects with custom build systems that emit SBOMs but lack
natively-parsed lockfiles:

```bash
osv-scanner scan --sbom my-app.cyclonedx.json
osv-scanner scan --sbom my-app.spdx.json
```

This composes with `syft-generation`
in the qa-sbom plugin - Syft generates the SBOM, OSV-Scanner
queries OSV.dev against it.

## Step 5 - `osv-scanner.toml` config

Per [osv-usage][osv-usage]:

```bash
osv-scanner --config ./my-osv-scanner-config.toml scan -r .
```

Example config:

```toml
# osv-scanner.toml
[[IgnoredVulns]]
id = "CVE-2024-1234"
ignoreUntil = 2026-12-15T00:00:00Z
reason = "Reachability analysis confirms unreachable; tracked in JIRA-1234"

[[IgnoredVulns]]
id = "GHSA-xxxx-yyyy-zzzz"
ignoreUntil = 2026-09-30T00:00:00Z
reason = "Vendor-supplied; pin to current version pending Q3 upgrade"

[[PackageOverrides]]
name = "lodash"
version = "4.17.20"
ecosystem = "npm"
ignore = true   # Suppress all vulns in this exact pinned version
reason = "Test fixture; not in production dependency graph"
```

## Step 6 - False-positive triage (MANDATORY)

Three suppression layers:

| Mechanism | Where | Use |
|---|---|---|
| `[[IgnoredVulns]]` in osv-scanner.toml (with `ignoreUntil`) | Repo root | Per-CVE; auditable in git |
| `[[PackageOverrides]]` in osv-scanner.toml | Repo root | Per-package version + ecosystem |
| `--severity-threshold` filter (when supported by version) | CI flag | Scan-time filter, not suppression |

**Justification template (mandatory in osv-scanner.toml):**

```toml
[[IgnoredVulns]]
id = "CVE-2024-1234"
ignoreUntil = 2026-12-15T00:00:00Z
reason = """
Reachability: function `vulnerable_func` not exported; verified via
git grep + dynamic instrumentation. Issue requires admin context
which is separately controlled.
Approved-by: alice@example.com
Re-review-date: 2026-09-15
"""
```

`ignoreUntil` is enforced by osv-scanner - past-due ignores are
re-surfaced in the scan results.

Cadence: every quarter, list all `[[IgnoredVulns]]` entries +
re-validate the `reason`; expired ones removed; persistent ones
escalated to upgrade work.

## Step 7 - Exit codes + CI gating

OSV-Scanner exit codes (verify against current docs):

- 0 - no vulnerabilities found
- 1 - vulnerabilities found
- 127 - config error

```yaml
jobs:
  osv:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: google/osv-scanner-action/osv-scanner-action@v1
        with:
          scan-args: |-
            --recursive
            --skip-git
            --format=sarif
            --output=osv.sarif
            ./
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: osv.sarif }
```

The `google/osv-scanner-action` GHA wraps the Docker invocation +
SARIF upload.

## Step 8 - License-checking (adjacent feature)

OSV-Scanner has experimental license-summary support:

```bash
osv-scanner --experimental-licenses-summary scan -r .
```

For full license-compliance + scanning, pair with `spdx-format`
(in the qa-sbom plugin) or use a dedicated tool like ScanCode / FOSSology.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `[[IgnoredVulns]]` without `ignoreUntil` | Per [osv-usage][osv-usage] config schema may reject; OR debt persists | Mandatory `ignoreUntil:` (Step 5) |
| Skip `--format=sarif` upload | Findings invisible in GitHub Security tab | Always SARIF output (Step 7) |
| Run only OSV-Scanner; skip Snyk | OSV.dev DB has its own coverage profile | Layered (Step 1 cross-ref) |
| Use OSV-Scanner without lockfile | Falls back to manifest scanning; less accurate version resolution | Always commit lockfile + scan via `-L` |
| Hardcode `--config=tmp.toml` outside repo | Suppressions not auditable in git | Commit `osv-scanner.toml` to repo root |

## Limitations

- OSV.dev DB coverage varies by ecosystem - Python / npm / Go are
  strong; less common ecosystems thinner.
- Reachability analysis is NOT included - every CVE on a declared
  dep counts even if the vulnerable function isn't called.
- Container image scanning is limited; for that, prefer
  `trivy-image` or `grype-scanning` (in the qa-sbom plugin).
- Per [osv-usage][osv-usage], some CLI surface evolves - verify
  against current osv-scanner help output.

## References

- [osv-usage][osv-usage] - usage page (lockfile, SBOM, config)
- google.github.io/osv-scanner - full docs
- github.com/google/osv-scanner - repository
- osv.dev - OSV vulnerability database
- ossf.github.io/osv-schema/ - OSV schema
- [`snyk-test`](../snyk-test/SKILL.md),
  [`dependabot-config`](../dependabot-config/SKILL.md),
  [`renovate-config`](../renovate-config/SKILL.md),
  [`npm-pip-maven-audit`](../npm-pip-maven-audit/SKILL.md) - 
  sister tools
- `syft-generation` - 
  cross-plugin SBOM source
