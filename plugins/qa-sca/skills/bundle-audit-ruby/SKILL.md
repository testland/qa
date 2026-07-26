---
name: bundle-audit-ruby
description: "Installs and runs bundler-audit against a Ruby Gemfile.lock, updating the ruby-advisory-db corpus, scanning for vulnerable gem versions and insecure sources, suppressing false positives via .bundler-audit.yml, and gating CI on non-zero exit. Ruby-only SCA scanner: for other ecosystems use npm-pip-maven-audit (multi-ecosystem dispatcher), snyk-test, or osv-scanner; cargo-audit-rust is the Rust analog; once findings exist, reachability-analyzer downranks unreachable gems - not this."
---

# bundle-audit-ruby

[ba-readme]: https://github.com/rubysec/bundler-audit
[ruby-advisory-db]: https://github.com/rubysec/ruby-advisory-db

## Overview

`bundler-audit` ([github.com/rubysec/bundler-audit][ba-readme]) is a
standalone Ruby gem that scans `Gemfile.lock` against the
[ruby-advisory-db][ruby-advisory-db]: a community-maintained YAML corpus
of CVE, GHSA, and OSVDB advisories for RubyGems and Ruby runtimes.

Differentiation vs. `npm-pip-maven-audit`:
that skill treats `bundle audit` (the Bundler subcommand) as one line in a
multi-ecosystem dispatcher; this skill covers the full bundler-audit workflow:
advisory-db lifecycle, per-project suppression with justification, Rake task
integration, and JSON output for downstream tooling.

## When to use

- Ruby project has a `Gemfile.lock` and needs CVE/GHSA scanning.
- CI pipeline needs a fast, offline-capable SCA gate with no commercial
  license overhead.
- Team needs per-project advisory suppression with auditable justification
  in source control.
- Layering SCA: run bundler-audit for the Ruby-specific feed, pair with
  `osv-scanner` for OSV.dev cross-DB consensus.

## Step 1 - Install

Per [github.com/rubysec/bundler-audit][ba-readme]:

```bash
gem install bundler-audit
```

No system-level dependencies beyond a Ruby environment. After install,
run a one-time database fetch:

```bash
bundle-audit update
```

Per [ruby-advisory-db][ruby-advisory-db], the corpus is a git repository
of YAML files under `gems/` (per-RubyGem advisories) and `rubies/` (Ruby
runtime advisories). `bundle-audit update` syncs the local clone of this
repo. Subsequent `bundle-audit check --no-update` runs are fully offline.

## Step 2 - Basic scan

Per [github.com/rubysec/bundler-audit][ba-readme]:

```bash
bundle-audit check --update
```

The `--update` flag refreshes the local ruby-advisory-db before scanning,
ensuring the check sees the latest advisories. In environments where
outbound git is restricted, pre-update during a build step and scan with:

```bash
bundle-audit check --no-update
```

bundler-audit scans `Gemfile.lock` in the current directory and checks
two classes of issues ([github.com/rubysec/bundler-audit][ba-readme]):

1. Vulnerable gem versions - gem + version matched against ruby-advisory-db
   advisories with patched-version ranges.
2. Insecure sources - `http://` and `git://` source URIs that transmit
   without TLS.

## Step 3 - Output formats

Per [github.com/rubysec/bundler-audit][ba-readme]:

| Flag | Output |
|---|---|
| (none) | Default human-readable text |
| `--format json` | JSON; suitable for multi-tool SCA triage |
| `--output FILE` | Write output to file instead of stdout |

JSON + file example, useful as a CI artifact:

```bash
bundle-audit check --update --format json --output bundle-audit.json
```

To scan a `Gemfile.lock` at a non-default path
([github.com/rubysec/bundler-audit][ba-readme]):

```bash
bundle-audit check --gemfile-lock path/to/Gemfile.custom.lock --update
```

## Step 4 - Advisory suppression

Per [github.com/rubysec/bundler-audit][ba-readme], create
`.bundler-audit.yml` at the project root:

```yaml
---
ignore:
  - CVE-2024-1234
  - GHSA-xxxx-yyyy-zzzz
```

The `ignore` array takes CVE, GHSA, or OSVDB identifiers. These are
committed to source control, making suppressions auditable in git history.

**Justification template (mandatory in team practice):**

```yaml
---
# Suppressions last reviewed: 2026-06-04
# Re-review by: 2026-09-04
ignore:
  # CVE-2024-1234: vulnerable function not reachable; foo-gem used only in
  # test fixtures. Verified via grep + code review. Approved: alice@example.com
  - CVE-2024-1234
```

Inline comments in YAML document the reachability analysis, approver, and
re-review date. Suppressions without comments are a code-smell: reviewers
should treat undocumented ignores as unapproved.

Per-run suppression (not persisted):

```bash
bundle-audit check --ignore CVE-2024-1234 --ignore GHSA-xxxx-yyyy-zzzz
```

Use `--ignore` flags only in automated temporary workarounds; prefer
`.bundler-audit.yml` for anything committed.

## Step 5 - Rake integration

Per [github.com/rubysec/bundler-audit][ba-readme], add to your `Rakefile`:

```ruby
require 'bundler/audit/task'
Bundler::Audit::Task.new
```

This registers two Rake tasks:

- `rake bundle:audit` - runs the audit check.
- `rake bundle:audit:update` - updates the local advisory database.

Rake integration composes with existing test pipelines:

```ruby
task default: %w[spec bundle:audit]
```

The `bundle:audit` task exits non-zero on findings, making it a natural
gate before a `spec` run or within a CI task matrix.

## Step 6 - Exit codes and CI gating

Per [github.com/rubysec/bundler-audit][ba-readme]:

- Exit `0` - no vulnerabilities or insecure sources found.
- Exit non-zero - at least one vulnerability or insecure source found.

GitHub Actions example:

```yaml
jobs:
  bundle-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      - name: Install bundler-audit
        run: gem install bundler-audit
      - name: Run audit
        run: bundle-audit check --update --format json --output bundle-audit.json
      - name: Upload findings
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bundle-audit
          path: bundle-audit.json
```

The `if: always()` upload ensures findings are accessible even when the
audit step fails, enabling triage without re-running the workflow.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `--update` in CI | Local db may lag by weeks; misses recent advisories | Always `--update` in CI or pre-update in a dedicated step |
| `--ignore` flags hardcoded in CI YAML | Not auditable in git; no justification attached | Move to `.bundler-audit.yml` with inline comments |
| Scan with no `Gemfile.lock` committed | bundler-audit reads only the lockfile; no lockfile means no scan | Commit `Gemfile.lock`; failing to do so is an anti-pattern per [ba-readme][ba-readme] |
| Suppress an advisory indefinitely | No expiry signal; suppressions rot silently | Add re-review date in comment; enforce via quarterly review |
| Run bundler-audit only; skip cross-DB scanner | ruby-advisory-db covers Ruby ecosystem; OSV.dev may surface additional findings | Pair with `osv-scanner` for cross-DB coverage |

## Limitations

- Scans `Gemfile.lock` only; gems loaded outside Bundler (standalone
  `require`) are not visible to bundler-audit.
- No reachability analysis: every advisory on a locked gem counts even if
  the vulnerable code path is not exercised.
- ruby-advisory-db coverage is community-maintained
  ([ruby-advisory-db][ruby-advisory-db]); advisories without a community
  submission are absent until filed.
- `--ignore` has no built-in expiry mechanism; teams must enforce review
  cadence in process, not in tooling.

## References

- [github.com/rubysec/bundler-audit][ba-readme] - installation, CLI flags,
  config, Rake integration, exit codes
- [github.com/rubysec/ruby-advisory-db][ruby-advisory-db] - advisory corpus
  structure (gems/ + rubies/ YAML files), CVE/GHSA/OSVDB coverage
- `npm-pip-maven-audit` - multi-ecosystem
  native audit dispatcher; covers `bundle audit` as one ecosystem among many
- `osv-scanner` - OSV.dev cross-DB scanner;
  pairs for cross-ecosystem consensus
- `snyk-test` - commercial SCA with Snyk DB
