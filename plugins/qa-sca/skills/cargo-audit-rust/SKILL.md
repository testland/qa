---
name: cargo-audit-rust
description: "Configures and runs cargo-audit against the RustSec Advisory Database for Rust projects; covers `cargo audit` (vulnerability scan), `cargo audit fix` (automated dependency updates), `--deny unmaintained|unsound|yanked|warnings` exit-code control, `audit.toml` per-advisory suppression with mandatory `expires` + `reason`, SARIF output for GitHub Code Scanning upload, and `rustsec/audit-check` GitHub Actions integration. Use when the codebase has a Cargo.lock and needs Rust-specific SCA beyond what the multi-ecosystem npm-pip-maven-audit wrapper provides."
---

# cargo-audit-rust

[rustsec-readme]: https://github.com/rustsec/rustsec/blob/main/cargo-audit/README.md
[audit-check-action]: https://github.com/rustsec/audit-check
[rustsec-advisories]: https://rustsec.org/advisories/

## Overview

`cargo-audit` scans a project's `Cargo.lock` against the
[RustSec Advisory Database][rustsec-advisories] for vulnerable, unmaintained,
unsound, and yanked crates.

Differentiation from `npm-pip-maven-audit`: that skill lists `cargo audit` as
one line in a multi-ecosystem wrapper; this skill covers the Rust-specific
depth (`--deny` semantics, `audit.toml` schema, `cargo audit fix`, SARIF,
binary auditing, the `rustsec/audit-check` Action).

## When to use

- Rust project has a `Cargo.lock` (binary or library with lockfile committed).
- CI must gate on new RustSec advisories in addition to compile checks.
- Team wants automated fix PRs for vulnerable transitive dependencies.
- Unmaintained or unsound crates must surface as hard failures, not just
  informational warnings.
- Layered SCA: pair with `osv-scanner` for cross-DB consensus (OSV.dev imports
  RustSec advisories, so divergence flags a DB-specific gap).

## Step 1 - Install

Per [cargo-audit README][rustsec-readme]:

```bash
cargo install cargo-audit --locked
```

Minimum Rust version: 1.74 per [rustsec-readme][rustsec-readme].

Platform package managers (consult [rustsec-readme][rustsec-readme] for
current availability):

```bash
# Alpine Linux
apk add cargo-audit

# Arch Linux
pacman -S cargo-audit

# macOS Homebrew
brew install cargo-audit
```

To enable the `cargo audit fix` subcommand, install with the `fix` feature
([rustsec-readme][rustsec-readme]):

```bash
cargo install cargo-audit --features=fix --locked
```

## Step 2 - Basic scan

Run at the workspace root where `Cargo.lock` lives
([rustsec-readme][rustsec-readme]):

```bash
cargo audit
```

Scan a specific lockfile path ([rustsec-readme][rustsec-readme]):

```bash
cargo audit -f path/to/Cargo.lock
```

cargo-audit fetches the RustSec Advisory Database on first run (a git clone
into `~/.cargo/advisory-db`). Pass `--no-fetch` to skip the fetch in air-gapped
environments ([rustsec-readme][rustsec-readme]).

## Step 3 - Exit codes and --deny flags

Exit codes per [cargo-audit source][rustsec-readme]:

| Code | Meaning |
|---|---|
| 0 | No vulnerabilities / denial criteria not triggered |
| 1 | Vulnerabilities found matching denial criteria |
| 2 | Execution error (missing lockfile, DB fetch failure) |

The `--deny` flag turns advisory categories into hard failures
([cargo-audit source - audit.rs](https://github.com/rustsec/rustsec/blob/main/cargo-audit/src/commands/audit.rs)):

```bash
# Fail on any vulnerability
cargo audit --deny warnings

# Fail on unmaintained crates specifically
cargo audit --deny unmaintained

# Fail on unsound (memory-unsafe) crates
cargo audit --deny unsound

# Fail on yanked crates in the lockfile
cargo audit --deny yanked

# Combine: fail on vulnerabilities AND unmaintained
cargo audit --deny warnings --deny unmaintained
```

`--deny warnings` is the special catch-all: it enables all denial categories
simultaneously per [audit.rs source][rustsec-readme].

## Step 4 - Output formats

Per [cargo-audit source][rustsec-readme], `--format` supports three values:

| Value | Use |
|---|---|
| `terminal` | Default human-readable output |
| `json` | Machine-readable; pipe to multi-tool SCA triage |
| `sarif` | SARIF 2.1; upload to GitHub Code Scanning |

```bash
# JSON output for programmatic consumption
cargo audit --format json > cargo-audit.json

# SARIF output for GitHub Security tab
cargo audit --format sarif > cargo-audit.sarif
```

## Step 5 - audit.toml suppression

Persistent suppression belongs in `.cargo/audit.toml` at the repo root, not
CLI `--ignore` flags (not auditable in git). Every ignored advisory carries a
mandatory reason and re-review date:

```toml
[advisories]
ignore = ["RUSTSEC-2024-0999"]
# RUSTSEC-2024-0999: serde_cbor unmaintained
# Reason: we use serde_cbor only in test fixtures, not in production paths.
# Approved-by: alice@example.com
# Re-review-date: 2026-09-30
# Tracking: JIRA-4567
```

Commit `.cargo/audit.toml` so suppressions are auditable in git history and
code review. The full `[advisories]`/`[output]`/`[database]` config schema is in
[references/cargo-audit-config-and-ci.md](references/cargo-audit-config-and-ci.md).

## Step 6 - cargo audit fix

`cargo audit fix` automatically updates `Cargo.toml` version constraints to
pull in patched crate versions, then runs `cargo update`
([rustsec-readme][rustsec-readme]):

```bash
# Preview changes without modifying files
cargo audit fix --dry-run

# Apply updates
cargo audit fix
```

Limitations: `cargo audit fix` is experimental per [rustsec-readme][rustsec-readme];
it updates version constraints but cannot resolve conflicts in the dependency
graph - manual intervention is needed when the patched version is incompatible
with other constraints. Always run `cargo test` after applying fixes.

## Step 7 - CI and binary auditing

GitHub Actions integration (the official `rustsec/audit-check` action plus
SARIF upload) and compiled-binary auditing (`cargo auditable` build +
`cargo audit bin`) are in
[references/cargo-audit-config-and-ci.md](references/cargo-audit-config-and-ci.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `--ignore RUSTSEC-xxxx` in CI script | Not auditable in git; lost on script rewrite | Use `[advisories] ignore` in `.cargo/audit.toml` committed to repo |
| No `reason` comment next to `ignore` | Silent debt accumulation | Mandatory reason + re-review date (Step 5 template) |
| `cargo audit` without `--deny` | Vulnerabilities surface as warnings, not failures | Add `--deny warnings` or set `deny = ["warnings"]` in `audit.toml` |
| Skip `--format sarif` upload | Findings invisible in GitHub Security tab | Emit SARIF + upload (Step 7) |
| `cargo audit fix` without `cargo test` | A patched dep version may break compilation or tests | Always test after fix (Step 6) |
| Omitting `Cargo.lock` from git (library crates) | `cargo audit` has nothing to scan | Commit `Cargo.lock` or generate it with `cargo generate-lockfile` in CI |

## Limitations

- Reachability analysis is not included: every CVE on a declared dependency
  counts even if the vulnerable function is not called. Pair with manual
  code review for high-severity suppressions.
- `cargo audit fix` is experimental per [rustsec-readme][rustsec-readme] and
  cannot resolve conflicting version constraints automatically.
- The RustSec DB covers crates published on crates.io; vendored or
  path-dependency crates are not covered.
- Binary auditing requires `cargo-auditable` to have been used at compile
  time; binaries without embedded metadata cannot be audited (Step 7).

## References

- [rustsec-readme][rustsec-readme] - cargo-audit install, usage, flags, fix
- [audit-check-action][audit-check-action] - `rustsec/audit-check` GitHub Action
- [rustsec-advisories][rustsec-advisories] - RustSec advisory database browser
- Full `audit.toml` schema, binary auditing, and CI wiring:
  [references/cargo-audit-config-and-ci.md](references/cargo-audit-config-and-ci.md)
- rustsec.org - RustSec project home; ecosystem tools (cargo-deny, cargo-auditable)
- github.com/rustsec/rustsec - monorepo: cargo-audit, rustsec crate, advisory-db
- `npm-pip-maven-audit` - multi-ecosystem
  native audit wrapper (mentions cargo-audit as one of eight tools)
- `osv-scanner` - cross-DB pair; OSV.dev receives
  RustSec exports in real time
