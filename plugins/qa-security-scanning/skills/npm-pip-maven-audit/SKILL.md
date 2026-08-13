---
name: npm-pip-maven-audit
description: "Configures and runs native package-manager audit commands across ecosystems - `npm audit --audit-level=high` (npm), `yarn npm audit` (Yarn 2+), `pnpm audit` (pnpm), `pip-audit` (Python via PyPA), `mvn dependency:check` (Maven via OWASP Dependency-Check plugin), `cargo audit` (Rust, with `.cargo/audit.toml` suppression, `--deny` semantics, SARIF, binary auditing, and the rustsec/audit-check Action as a reference), and `bundle audit` (Ruby Bundler, with `.bundler-audit.yml` waivers, Rake integration, and CI gating as a reference); fastest no-install-required SCA option. Use when the team wants fast, no-extra-tooling SCA in CI as a first line of defense, when a Rust or Ruby repo needs its ecosystem-native scanner, or pairs with snyk/osv-scanner for layered coverage."
---

# npm-pip-maven-audit

## Overview

Most package managers ship native audit subcommands that query an
ecosystem-specific advisory feed (npm advisories, PyPA, RubySec, Cargo advisory
DB, etc.) - the **fastest first-line defense**: already installed, no extra
tooling, runs in seconds. For full coverage, run one native audit + a unified
scanner (`snyk-test` / `osv-scanner`). The speed/coverage tradeoff table is in
[references/ecosystem-config-and-triage.md](references/ecosystem-config-and-triage.md).

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

Maven has no native `mvn audit`; use the OWASP Dependency-Check plugin, which
fails the build above a CVSS threshold and emits HTML/JSON/SARIF:

```bash
mvn dependency-check:check
```

The `pom.xml` plugin block (with `failBuildOnCVSS` + suppression file) and the
Gradle equivalent are in
[references/ecosystem-config-and-triage.md](references/ecosystem-config-and-triage.md).

Source: jeremylong.github.io/DependencyCheck/dependency-check-maven/.

## Step 4 - cargo audit (Rust)

```bash
cargo install cargo-audit

cargo audit
cargo audit --json
cargo audit --deny warnings              # treat warnings as errors
cargo audit --ignore RUSTSEC-2023-0001   # specific advisory
```

Source: rustsec.org + github.com/rustsec/rustsec.

Exit codes, per-category `--deny` flags, the committed `.cargo/audit.toml`
suppression schema, SARIF output, `cargo audit fix`, binary auditing
(`cargo audit bin`), and the `rustsec/audit-check` Action are in
[references/cargo-bundle-audit.md](references/cargo-bundle-audit.md).

## Step 5 - bundler-audit (Ruby)

```bash
gem install bundler-audit

bundle-audit check                        # one-time scan
bundle-audit update                       # refresh advisory DB
bundle-audit check --update               # combined refresh + scan
bundle-audit check --ignore CVE-2024-1234 # specific CVE
```

Source: github.com/rubysec/bundler-audit.

The committed `.bundler-audit.yml` waiver template (inline justification +
re-review date), Rake task wiring, JSON output, and the CI gate are in
[references/cargo-bundle-audit.md](references/cargo-bundle-audit.md).

## Step 6 - False-positive triage (MANDATORY)

Each native audit has its own suppression mechanism:

| Tool | Suppression |
|---|---|
| `npm audit` | `npm audit --omit dev` (skip devDependencies) + `package.json` `overrides` field for forced version pin |
| `pip-audit` | `--ignore-vuln <id>` CLI flag (per-CVE) |
| `dependency-check-maven` | `dependency-check-suppressions.xml` (XML schema with vuln-name regex + reason) |
| `cargo audit` | committed `.cargo/audit.toml` `[advisories] ignore` (preferred over `--ignore` CLI flags - see references/cargo-bundle-audit.md) |
| `bundle-audit` | committed `.bundler-audit.yml` `ignore:` list (preferred over `--ignore` CLI flags - see references/cargo-bundle-audit.md) |

Every suppression carries a mandatory justification (reason + approver +
re-review date). The Maven XML template, the `AUDIT_IGNORES.md` pattern for
ad-hoc CLI ignores, and the quarterly review cadence are in
[references/ecosystem-config-and-triage.md](references/ecosystem-config-and-triage.md).

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

- Per-ecosystem DB coverage varies; one ecosystem's feed may carry a CVE
  another lacks.
- No reachability analysis: every CVE on a declared dep counts even if the
  vulnerable function isn't called.
- Maven Dependency-Check requires an NVD data sync (slow first run, ~1 GB cache).
- `npm audit fix --force` bumps majors; always manual-review before applying.
- Yarn classic (1.x) and pnpm have slightly different audit output shapes vs npm.

## References

- Native audit docs: npm (docs.npmjs.com/cli/v10/commands/npm-audit), Yarn
  (yarnpkg.com/cli/npm/audit), pnpm (pnpm.io/cli/audit), pip-audit
  (pypa.github.io/pip-audit), OWASP Dependency-Check
  (jeremylong.github.io/DependencyCheck), cargo-audit (rustsec.org),
  bundler-audit (github.com/rubysec/bundler-audit)
- Per-ecosystem config, triage templates, and output aggregation:
  [references/ecosystem-config-and-triage.md](references/ecosystem-config-and-triage.md)
- Rust + Ruby depth (audit.toml, `.bundler-audit.yml`, SARIF, binary auditing,
  Rake/Actions wiring):
  [references/cargo-bundle-audit.md](references/cargo-bundle-audit.md)
- `snyk-test`, `osv-scanner`, `dependabot-config`, `renovate-config` - sister tools
