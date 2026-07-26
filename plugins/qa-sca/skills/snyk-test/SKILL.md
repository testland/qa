---
name: snyk-test
description: "Configures and runs Snyk - multi-mode SCA + SAST + Container + IaC scanner: snyk test (one-shot scan), snyk monitor (continuous vuln alerts), snyk code test (SAST), snyk container test (container); policy file .snyk for ignore + patch. Commercial multi-ecosystem scanner: for OSS/no-license scanning use osv-scanner or npm-pip-maven-audit; bundle-audit-ruby and cargo-audit-rust are the single-ecosystem alternatives; snyk finds vulns, reachability-analyzer decides which matter - not this."
---

# snyk-test

[sn-gh]: https://github.com/snyk/snyk

Per [github.com/snyk/snyk][sn-gh], companion subcommands cover adjacent surfaces:

| Subcommand | Surface |
|---|---|
| `snyk test` | SCA (open-source dependencies) |
| `snyk code test` | SAST (proprietary code) |
| `snyk container test <image>` | Container image scanning |
| `snyk iac test` | IaC scanning (Terraform, Kubernetes) |
| `snyk monitor` | Continuous monitoring with new-vuln alerts |

This skill focuses on `snyk test` for SCA. For SAST coverage,
prefer the OSS-first patterns in `semgrep-rules` (in the qa-sast plugin);
for container scanning, see `trivy-image` (in the qa-sbom plugin).

## When to use

- The team has a Snyk license and uses Snyk as primary SCA.
- Multi-language project with mixed package managers - Snyk's
  auto-detect simplifies setup vs running per-ecosystem audit
  commands.
- Continuous-monitoring requirement (vuln alerts on
  newly-disclosed CVEs against pinned dependencies).
- Layered with `osv-scanner` for
  cross-DB consensus signal.

## Step 1 - Install + authenticate

Per [sn-gh][sn-gh]:

```bash
npm install -g snyk
snyk auth
```

The `snyk auth` flow opens a browser window; the credential is
stored at `~/.config/configstore/snyk.json`. For CI, use
`SNYK_TOKEN` env var (no `snyk auth` needed):

```bash
export SNYK_TOKEN=$(cat /path/to/snyk-token)
snyk test
```

## Step 2 - Basic SCA scan

Per [sn-gh][sn-gh]: "Run `snyk test` in a directory containing a
supported package manifest (like `package.json` or `pom.xml`)."

```bash
snyk test                              # current dir; auto-detects manifest
snyk test --all-projects               # recursive multi-manifest scan
snyk test --org=my-org                 # explicit org context
snyk test --severity-threshold=high    # filter LOW + MEDIUM (less noise)
snyk test --fail-on=upgradable         # only fail if upgrade available
```

Common output format flags:

```bash
snyk test --json                                  # JSON for parsing
snyk test --json-file-output=snyk.json             # JSON to file
snyk test --sarif-file-output=snyk.sarif           # SARIF for GHA
```

The JSON / SARIF output feeds downstream aggregation
for cross-tool deduplication + prioritization.

## Step 3 - `snyk monitor` for continuous tracking

```bash
snyk monitor --org=my-org --project-name=my-app
```

Per [sn-gh][sn-gh]: "create dependency snapshots and receive alerts
about newly disclosed vulnerabilities."

The snapshot lives on snyk.io/app/your-org; new CVEs disclosed
against your pinned versions trigger email + Slack alerts (configured
in Snyk dashboard).

## Step 4 - `.snyk` policy file

Per Snyk's policy-file model (consult docs.snyk.io for current
schema), `.snyk` lives at the project root and supports:

```yaml
# .snyk
version: v1.0.0
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: "False positive; we don't pass user input to Lodash sortBy"
        expires: '2026-12-15T00:00:00.000Z'
        created: '2026-05-15T00:00:00.000Z'
patch: {}
```

Per-vuln ignore can be scoped to specific paths (`* > lodash`,
`my-package > lodash`) and **must include an `expires:` field** - Snyk policy validates this at scan time.

## Step 5 - False-positive triage (MANDATORY)

Three suppression layers:

| Mechanism | Where | Use |
|---|---|---|
| `.snyk` policy file ignore (with expiration) | Repo root | Per-vuln + per-path; auditable in git history |
| Snyk dashboard "Ignore" action | snyk.io/app | Org-wide; persistent; reviewer-tracked |
| `--severity-threshold=` filter | CI flag | Scan-time noise reduction (not suppression) |
| `--fail-on=upgradable` flag | CI flag | Only fail if a fix exists; soft gate |

**Justification template (mandatory in `.snyk`):**

```yaml
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: |
          Reason: Lodash sortBy not exposed to user input;
          attack path requires admin context which is separately
          controlled. Verified in code review (PR #1234).
        approved-by: alice@example.com
        expires: '2026-12-15T00:00:00.000Z'
        created: '2026-05-15T00:00:00.000Z'
        re-review-date: '2026-09-15T00:00:00.000Z'
```

Cadence: every quarter, list `.snyk` policies grouped by
`re-review-date` and process expired entries.

## Step 6 - CI integration

```yaml
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: snyk/actions/setup@master
      - run: snyk test --severity-threshold=high --json-file-output=snyk.json
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      - run: snyk monitor   # snapshot for continuous monitoring
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        if: github.ref == 'refs/heads/main'
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: snyk-report, path: snyk.json }
```

## Step 7 - Multi-language support

Per [sn-gh][sn-gh]: Snyk scans "Open Source (via package managers)",
"Application code vulnerabilities", "Container images and Kubernetes
applications", and "Infrastructure as Code (Terraform, Kubernetes)."

Auto-detection covers package managers including npm / yarn / pnpm
/ pip / pipenv / poetry / Maven / Gradle / sbt / Composer / RubyGems
/ Go modules / Cargo / Hex / NuGet / CocoaPods / Swift Package
Manager.

For unsupported / custom package managers, generate an SBOM and
feed via `snyk test --file=sbom.cyclonedx.json` (post-2024 feature;
verify against current docs).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run `snyk test` without `--severity-threshold` | Noise on first scan; team disables | Start `--severity-threshold=high` (Step 2) |
| `.snyk` ignore without `expires` | Snyk policy rejects; OR debt persists forever | Mandatory `expires:` (Step 4) |
| Skip `snyk monitor` on main branch | Newly-disclosed CVEs against pinned deps go undetected | Add to main-branch CI (Step 6) |
| Run only Snyk; skip OSV | Single-DB blind spots | Pair with osv-scanner (cross-ref) |
| Hardcode SNYK_TOKEN in scripts | Token leak | CI secret + redact (Step 6) |

## Limitations

- Commercial license required - pricing scales with project count
  + scanned manifests.
- Snyk's vuln database has its own coverage profile; pair with
  `osv-scanner` for OSV.dev consensus.
- Container scanning is a separate product line; this skill targets
  SCA only.
- For pure-OSS workflows without Snyk, `osv-scanner`
  + `npm-pip-maven-audit` cover
  similar ground.

## References

- [sn-gh][sn-gh] - repository, install, basic commands
- docs.snyk.io - full documentation
- docs.snyk.io/snyk-cli/commands/test - `snyk test` reference (when not 404'd)
- snyk.io/security-rules - vuln database
- `osv-scanner`,
  `dependabot-config`,
  `renovate-config`,
  `npm-pip-maven-audit` - 
  sister tools
