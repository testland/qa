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

## How to use

1. Install the CLI (`npm install -g snyk`) and authenticate with `snyk auth`, or
   set `SNYK_TOKEN` in CI.
2. Run `snyk test` in a directory with a supported manifest; start with
   `--severity-threshold=high` to cut first-scan noise.
3. Emit machine-readable output with `--json-file-output=snyk.json` (or
   `--sarif-file-output`) for downstream aggregation and deduplication.
4. Add `snyk monitor` on the main branch to get alerts when new CVEs are
   disclosed against pinned versions.
5. Triage false positives through a `.snyk` policy ignore with a mandatory
   `expires:` field - see
   [references/snyk-policy-and-triage.md](references/snyk-policy-and-triage.md).
6. Gate CI on the scan and upload the report artifact; keep `SNYK_TOKEN` in a CI
   secret, never hardcoded.
7. Pair with `osv-scanner` for cross-database consensus, and re-review `.snyk`
   ignores every quarter.

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

## Step 4 - `.snyk` policy + false-positive triage (MANDATORY)

Suppress false positives through a `.snyk` policy file at the repo root. Every
per-vuln ignore **must include an `expires:` field** - Snyk validates this at
scan time. Layer `.snyk` ignores (auditable in git) with dashboard ignores
(org-wide) and the `--severity-threshold=` / `--fail-on=upgradable` CI filters,
and re-review each ignore quarterly.

Full policy schema, the mandatory justification template, the suppression-layer
table, and the re-review cadence:
[references/snyk-policy-and-triage.md](references/snyk-policy-and-triage.md).

## Step 5 - CI integration

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

## Step 6 - Multi-language support

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

## Worked example

A team with a Snyk license adds SCA to a mixed npm + Maven monorepo. In CI they
run `snyk test --all-projects --severity-threshold=high
--json-file-output=snyk.json`, which auto-detects both `package.json` and
`pom.xml` and reports 3 high-severity findings. One is `SNYK-JS-LODASH-567746`
in a `lodash` path that never receives user input. A reviewer verifies the
attack path is unreachable, then adds a `.snyk` ignore with `reason:`,
`approved-by:`, `expires: '2026-12-15...'`, and a `re-review-date`, so the next
scan passes the `--severity-threshold=high` gate. `snyk monitor` runs on `main`
to snapshot the dependency tree, and the team pairs the run with `osv-scanner`
for cross-database consensus. The `.snyk` ignore resurfaces in the quarterly
re-review grouped by `re-review-date`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run `snyk test` without `--severity-threshold` | Noise on first scan; team disables | Start `--severity-threshold=high` (Step 2) |
| `.snyk` ignore without `expires` | Snyk policy rejects; OR debt persists forever | Mandatory `expires:` (Step 4) |
| Skip `snyk monitor` on main branch | Newly-disclosed CVEs against pinned deps go undetected | Add to main-branch CI (Step 5) |
| Run only Snyk; skip OSV | Single-DB blind spots | Pair with osv-scanner (cross-ref) |
| Hardcode SNYK_TOKEN in scripts | Token leak | CI secret + redact (Step 5) |

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
- [references/snyk-policy-and-triage.md](references/snyk-policy-and-triage.md) -
  `.snyk` policy schema, suppression layers, justification template, re-review cadence
- docs.snyk.io - full documentation
- docs.snyk.io/snyk-cli/commands/test - `snyk test` reference (when not 404'd)
- snyk.io/security-rules - vuln database
- `osv-scanner`,
  `dependabot-config`,
  `renovate-config`,
  `npm-pip-maven-audit` - 
  sister tools
