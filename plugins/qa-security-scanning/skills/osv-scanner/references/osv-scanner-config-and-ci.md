# osv-scanner config, triage, and CI

Deep reference for the `osv-scanner` SKILL.md. SKILL.md keeps install, the
recursive/per-lockfile scan, output formats, SBOM input, exit codes, and a
minimal ignore snippet; this file holds the full `osv-scanner.toml` schema, the
justification template, and the GitHub Actions workflow.

[osv-usage]: https://google.github.io/osv-scanner/usage/

## Full `osv-scanner.toml` schema

Point the scanner at a config with `--config` ([osv-usage][osv-usage]):

```bash
osv-scanner --config ./my-osv-scanner-config.toml scan -r .
```

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

## Suppression layers and justification

Three suppression layers:

| Mechanism | Where | Use |
|---|---|---|
| `[[IgnoredVulns]]` in osv-scanner.toml (with `ignoreUntil`) | Repo root | Per-CVE; auditable in git |
| `[[PackageOverrides]]` in osv-scanner.toml | Repo root | Per-package version + ecosystem |
| `--severity-threshold` filter (when supported by version) | CI flag | Scan-time filter, not suppression |

Justification is mandatory in osv-scanner.toml:

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

`ignoreUntil` is enforced by osv-scanner - past-due ignores are re-surfaced in
the scan results. Cadence: every quarter, list all `[[IgnoredVulns]]` entries +
re-validate the `reason`; expired ones removed, persistent ones escalated to
upgrade work.

## GitHub Actions CI

The `google/osv-scanner-action` GHA wraps the Docker invocation + SARIF upload:

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
