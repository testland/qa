---
name: npm-pip-maven-audit
description: "Configures and runs native package-manager audit commands across ecosystems - `npm audit --audit-level=high` (npm), `yarn npm audit` (Yarn 2+), `pnpm audit` (pnpm), `pip-audit` (Python via PyPA), `mvn dependency:check` (Maven via OWASP Dependency-Check plugin), `cargo audit` (Rust), `bundle audit` (Ruby Bundler); fastest no-install-required SCA option. Use when the team wants fast, no-extra-tooling SCA in CI as a first line of defense, or pairs with snyk/osv-scanner for layered coverage."
---

# npm-pip-maven-audit

## Overview

Most package managers ship native audit subcommands that query the
ecosystem-specific advisory feed (npm advisories, PyPA database,
RubySec, Cargo advisory DB, etc.). They're the **fastest first-line
defense** - already installed where the package manager is, no extra
tooling, runs in seconds.

Tradeoffs vs `snyk-test` / `osv-scanner`:

| Property | Native audit | Snyk / OSV |
|---|---|---|
| Speed | <5s typical | 10s - 60s |
| DB coverage | Per-ecosystem only | Cross-ecosystem aggregated |
| False-positive triage | Per-ecosystem CLI | Unified config |
| Reachability analysis | None | None (most tools) |
| CI integration | Built into package manager | Per-tool action |

For comprehensive coverage, run native audit + a unified scanner.
Native audit catches the high-confidence per-ecosystem feed
quickly; the unified scanner catches cross-ecosystem aggregations
and waivers.

## When to use

- Fast first-line CI gate (run before slower comprehensive scans).
- Single-ecosystem repo where one native audit is sufficient.
- Local dev loop: `npm audit` after `npm install` is faster than
  setting up Snyk locally.
- Layered with `snyk-test` +
  `osv-scanner` for full coverage.

## Step 1 - npm / Yarn / pnpm

```bash
# npm (built-in since npm 6)
npm audit
npm audit --audit-level=high              # filter to HIGH+CRITICAL
npm audit --json > audit.json
npm audit fix                              # auto-upgrade where compatible
npm audit fix --force                      # may break: bumps majors

# Yarn 2+ (Berry)
yarn npm audit
yarn npm audit --severity=high
yarn npm audit --recursive                 # scan all workspaces

# pnpm
pnpm audit
pnpm audit --audit-level high
pnpm audit --json
```

Source: docs.npmjs.com/cli/v10/commands/npm-audit + yarnpkg.com/cli/npm/audit + pnpm.io/cli/audit.

## Step 2 - pip-audit (Python)

```bash
pip install pip-audit

# Scan installed packages in current env
pip-audit

# Scan a requirements file
pip-audit -r requirements.txt

# Scan with PyPA + OSV.dev
pip-audit -s pypi -s osv

# JSON / SARIF output
pip-audit --format json --output pip-audit.json
pip-audit --format sarif --output pip-audit.sarif

# Fix vulnerabilities (auto-upgrade)
pip-audit --fix

# Skip specific CVEs
pip-audit --ignore-vuln GHSA-xxxx-yyyy-zzzz
```

Source: pypi.org/project/pip-audit + github.com/pypa/pip-audit.
`pip-audit` is the official PyPA tool (preferred over the older
`safety` package).

## Step 3 - Maven (OWASP Dependency-Check)

Maven's audit story is via the OWASP Dependency-Check plugin
(no native `mvn audit`):

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <version>10.0.4</version>
  <executions>
    <execution>
      <goals>
        <goal>check</goal>
      </goals>
    </execution>
  </executions>
  <configuration>
    <failBuildOnCVSS>7.0</failBuildOnCVSS>
    <suppressionFile>dependency-check-suppressions.xml</suppressionFile>
    <formats>
      <format>HTML</format>
      <format>JSON</format>
      <format>SARIF</format>
    </formats>
  </configuration>
</plugin>
```

```bash
mvn dependency-check:check
```

Source: jeremylong.github.io/DependencyCheck/dependency-check-maven/.

For Gradle: same plugin via `org.owasp.dependencycheck` Gradle
plugin.

## Step 4 - cargo audit (Rust)

```bash
cargo install cargo-audit

cargo audit
cargo audit --json
cargo audit --deny warnings              # treat warnings as errors
cargo audit --ignore RUSTSEC-2023-0001   # specific advisory
```

Source: rustsec.org + github.com/rustsec/rustsec.

## Step 5 - bundler-audit (Ruby)

```bash
gem install bundler-audit

bundle-audit check                        # one-time scan
bundle-audit update                       # refresh advisory DB
bundle-audit check --update               # combined refresh + scan
bundle-audit check --ignore CVE-2024-1234 # specific CVE
```

Source: github.com/rubysec/bundler-audit.

## Step 6 - False-positive triage (MANDATORY)

Each native audit has its own suppression mechanism:

| Tool | Suppression |
|---|---|
| `npm audit` | `npm audit --omit dev` (skip devDependencies) + `package.json` `overrides` field for forced version pin |
| `pip-audit` | `--ignore-vuln <id>` CLI flag (per-CVE) |
| `dependency-check-maven` | `dependency-check-suppressions.xml` (XML schema with vuln-name regex + reason) |
| `cargo audit` | `--ignore <id>` CLI flag (per RUSTSEC ID) |
| `bundle-audit` | `--ignore <id>` CLI flag (per CVE) |

**Justification template (mandatory in suppression file or
audit-skip list):**

```xml
<!-- dependency-check-suppressions.xml (Maven) -->
<suppress>
  <notes>
    Reason: log4j-core 2.14.x is bundled but not loaded at runtime
            (verified via dependency tree analysis)
    Approved-by: alice@example.com
    Re-review-date: 2026-09-15
  </notes>
  <packageUrl regex="true">^pkg:maven/org\.apache\.logging\.log4j/log4j-core@2\.14\..*$</packageUrl>
  <vulnerabilityName>CVE-2021-44228</vulnerabilityName>
</suppress>
```

For ad-hoc CLI ignores (`pip-audit --ignore-vuln`, `cargo audit
--ignore`), maintain a sibling `AUDIT_IGNORES.md` mapping each
ID to reason + approver + re-review-date. Without the sibling file,
the ignore is invisible to reviewers.

Cadence: every quarter, audit suppression entries; expired
re-review dates remove entries.

## Step 7 - CI integration patterns

```yaml
# Fast first-line gate
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      # npm
      - if: hashFiles('package-lock.json') != ''
        run: npm audit --audit-level=high
      # Python
      - if: hashFiles('requirements.txt') != ''
        run: pip-audit -r requirements.txt
      # Maven
      - if: hashFiles('pom.xml') != ''
        run: mvn dependency-check:check
      # Rust
      - if: hashFiles('Cargo.lock') != ''
        run: cargo audit
      # Ruby
      - if: hashFiles('Gemfile.lock') != ''
        run: bundle-audit check --update
```

The `if: hashFiles(...)` pattern auto-skips ecosystems not present
in the repo.

## Step 8 - Output aggregation

For downstream aggregation, output
each tool's JSON to a stable filename:

```bash
npm audit --json > sca-npm.json || true        # || true: don't fail before triage
pip-audit --format json --output sca-pip.json || true
mvn dependency-check:check -Dformats=JSON
cargo audit --json > sca-cargo.json || true
```

The aggregation step normalizes each tool's schema + dedupes cross-tool
findings.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `npm audit` without `--audit-level` | Low-severity noise overwhelms; team disables | Start with `--audit-level=high` (Step 1) |
| `npm audit fix --force` in CI | Bumps majors silently; breaks builds | Manual review for force-fix; never in CI |
| Suppress without `Re-review-date` | Permanent debt | Mandatory template (Step 6) |
| Skip `--update` for `bundle-audit` | Stale advisory DB; misses recent CVEs | Always `--update` (Step 5) |
| Ignore `bundle-audit check` exit code | Findings invisible | Let exit code propagate to CI |
| Use only native audit; skip Snyk/OSV | Per-ecosystem-DB blind spots | Layered (Step 1 cross-ref) |

## Limitations

- Per-ecosystem DB coverage varies - npm advisories often have CVE
  earlier than PyPA; pip-audit may miss a npm-only-disclosed
  advisory.
- No reachability analysis - every CVE on a declared dep counts
  even if the vulnerable function isn't called.
- Maven Dependency-Check requires NVD data sync (slow first run; ~1
  GB cache).
- `npm audit fix --force` is dangerous; always manual-review before
  applying.
- Yarn classic (1.x) and pnpm have slightly different audit output
  shapes vs npm.

## References

- docs.npmjs.com/cli/v10/commands/npm-audit - npm audit reference
- yarnpkg.com/cli/npm/audit - Yarn audit reference
- pnpm.io/cli/audit - pnpm audit reference
- pypa.github.io/pip-audit - pip-audit docs
- jeremylong.github.io/DependencyCheck/ - OWASP Dependency-Check
- rustsec.org / github.com/rustsec/rustsec - cargo-audit
- github.com/rubysec/bundler-audit - bundler-audit
- `snyk-test`,
  `osv-scanner`,
  `dependabot-config`,
  `renovate-config` - sister tools
