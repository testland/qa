# cargo audit (Rust) + bundle-audit (Ruby) - deep reference

Companion reference for `npm-pip-maven-audit` Steps 4-5. SKILL.md keeps the
one-command scans; consult this file for committed suppression files, exit-code
semantics, SARIF output, binary auditing, and Rake / GitHub Actions wiring.

[rustsec-readme]: https://github.com/rustsec/rustsec/blob/main/cargo-audit/README.md
[audit-check-action]: https://github.com/rustsec/audit-check
[ba-readme]: https://github.com/rubysec/bundler-audit
[ruby-advisory-db]: https://github.com/rubysec/ruby-advisory-db

## cargo audit (Rust)

`cargo-audit` scans `Cargo.lock` against the RustSec Advisory Database
(rustsec.org/advisories) for vulnerable, unmaintained, unsound, and yanked
crates. Minimum Rust version: 1.74 per [rustsec-readme][rustsec-readme].

```bash
cargo install cargo-audit --locked
# enable the `cargo audit fix` subcommand:
cargo install cargo-audit --features=fix --locked

cargo audit                       # run at the workspace root (Cargo.lock)
cargo audit -f path/to/Cargo.lock # explicit lockfile path
cargo audit --no-fetch            # skip advisory-db fetch (air-gapped)
```

First run clones the advisory DB into `~/.cargo/advisory-db`
([rustsec-readme][rustsec-readme]).

### Exit codes and --deny flags

| Code | Meaning |
|---|---|
| 0 | No vulnerabilities / denial criteria not triggered |
| 1 | Vulnerabilities found matching denial criteria |
| 2 | Execution error (missing lockfile, DB fetch failure) |

`--deny` turns advisory categories into hard failures; `--deny warnings` is
the catch-all that enables all denial categories
([cargo-audit audit.rs](https://github.com/rustsec/rustsec/blob/main/cargo-audit/src/commands/audit.rs)):

```bash
cargo audit --deny warnings                      # fail on any vulnerability
cargo audit --deny unmaintained --deny unsound   # per-category hard fail
cargo audit --deny yanked
```

### Output formats

`--format` supports `terminal` (default), `json`, and `sarif`
([rustsec-readme][rustsec-readme]):

```bash
cargo audit --format json > cargo-audit.json
cargo audit --format sarif > cargo-audit.sarif   # GitHub Code Scanning upload
```

### .cargo/audit.toml suppression

Persistent suppression belongs in a committed `.cargo/audit.toml`, not CLI
`--ignore` flags (not auditable in git). Per the
[audit.toml example](https://github.com/rustsec/rustsec/blob/main/cargo-audit/audit.toml.example):

```toml
# .cargo/audit.toml
[advisories]
ignore = ["RUSTSEC-2024-0999"]
# RUSTSEC-2024-0999: serde_cbor unmaintained; test fixtures only.
# Approved-by: alice@example.com  Re-review-date: 2026-09-30
informational_warnings = ["unmaintained", "unsound"]
severity_threshold = "medium"     # none | low | medium | high | critical

[output]
format = "terminal"               # terminal | json | sarif
deny = ["warnings"]               # mirrors --deny flags
show_tree = true

[database]
fetch = false                     # offline / air-gapped builds
stale = false
```

### cargo audit fix

```bash
cargo audit fix --dry-run   # preview
cargo audit fix             # update Cargo.toml constraints + cargo update
```

`cargo audit fix` is experimental per [rustsec-readme][rustsec-readme]; it
cannot resolve conflicting version constraints. Always run `cargo test` after.

### Binary auditing

```bash
cargo install cargo-auditable
cargo auditable build --release          # embeds Cargo.lock metadata
cargo audit bin target/release/my-app    # audit the compiled binary
```

Binaries built without `cargo-auditable` have no embedded metadata and cannot
be audited ([rustsec-readme][rustsec-readme]).

### GitHub Actions

The official [`rustsec/audit-check`][audit-check-action] action wraps
`cargo audit`, fails the check run on any security advisory, and opens a
GitHub Issue per advisory on scheduled runs:

```yaml
on:
  push:
    paths: ['**/Cargo.toml', '**/Cargo.lock']
  schedule:
    - cron: '0 0 * * *'
jobs:
  security_audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check@v2.0.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

SARIF upload alongside:

```yaml
      - run: cargo audit --format sarif > cargo-audit.sarif || true
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: cargo-audit.sarif }
```

### Rust-specific limitations

- RustSec DB covers crates.io; vendored / path-dependency crates are not covered.
- Library crates must commit `Cargo.lock` (or `cargo generate-lockfile` in CI)
  or there is nothing to scan.
- OSV.dev imports RustSec advisories in real time; pair with `osv-scanner` for
  cross-DB consensus.

## bundle-audit (Ruby)

`bundler-audit` ([ba-readme][ba-readme]) scans `Gemfile.lock` against the
[ruby-advisory-db][ruby-advisory-db] - a community-maintained YAML corpus of
CVE / GHSA / OSVDB advisories under `gems/` (per-gem) and `rubies/` (runtimes).
It checks two classes of issues: vulnerable gem versions and insecure sources
(`http://` / `git://` URIs).

```bash
gem install bundler-audit
bundle-audit update              # one-time advisory-db clone/sync
bundle-audit check --update      # refresh + scan (always --update in CI)
bundle-audit check --no-update   # fully offline once the DB is synced
```

Output flags ([ba-readme][ba-readme]):

| Flag | Output |
|---|---|
| `--format json` | JSON for multi-tool SCA triage |
| `--output FILE` | Write to file (CI artifact) |
| `--gemfile-lock PATH` | Non-default lockfile path |

### .bundler-audit.yml waivers

Committed suppression file at the project root ([ba-readme][ba-readme]); the
`ignore` array takes CVE / GHSA / OSVDB identifiers. Every ignore MUST carry an
inline justification - reachability finding, approver, re-review date;
reviewers treat undocumented ignores as unapproved:

```yaml
---
# Suppressions last reviewed: 2026-06-04  Re-review by: 2026-09-04
ignore:
  # CVE-2024-1234: vulnerable function not reachable; foo-gem used only in
  # test fixtures. Verified via grep + code review. Approved: alice@example.com
  - CVE-2024-1234
```

Per-run `--ignore CVE-2024-1234` flags are for temporary workarounds only;
they have no expiry mechanism - enforce a quarterly review cadence in process.

### Rake integration

Per [ba-readme][ba-readme]:

```ruby
require 'bundler/audit/task'
Bundler::Audit::Task.new
task default: %w[spec bundle:audit]   # audit gates the local test run
```

Adds `rake bundle:audit` and `rake bundle:audit:update`; `bundle:audit` exits
non-zero on findings.

### CI gating

`bundle-audit check` exits `0` clean, non-zero on findings ([ba-readme][ba-readme]):

```yaml
jobs:
  bundle-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with: { bundler-cache: true }
      - run: gem install bundler-audit
      - run: bundle-audit check --update --format json --output bundle-audit.json
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: bundle-audit, path: bundle-audit.json }
```

### Ruby-specific limitations

- Reads `Gemfile.lock` only; gems loaded outside Bundler are invisible.
- ruby-advisory-db is community-maintained; unfiled advisories are absent.
- Pair with `osv-scanner` for OSV.dev cross-DB coverage.
