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

## How to use

1. Install bundler-audit (`gem install bundler-audit`); no system deps beyond a Ruby environment.
2. Update the local ruby-advisory-db corpus (`bundle-audit update`) so the scan sees current advisories.
3. Scan the `Gemfile.lock` (`bundle-audit check --update`), which flags vulnerable gem versions and insecure `http://` / `git://` sources.
4. Triage each finding: bump the gem to a fixed version, or confirm it is a false positive.
5. Suppress confirmed false positives in `.bundler-audit.yml` with a justification comment (approver + re-review date) - full waiver syntax in [references/bundle-audit-ci.md](references/bundle-audit-ci.md).
6. Gate CI on the non-zero exit code so any unresolved advisory fails the build - GitHub Actions and Rake wiring in [references/bundle-audit-ci.md](references/bundle-audit-ci.md).

## Install

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

## Scan

Per [github.com/rubysec/bundler-audit][ba-readme]:

```bash
bundle-audit check --update
```

The `--update` flag refreshes the local ruby-advisory-db before scanning,
ensuring the check sees the latest advisories. Where outbound git is
restricted, pre-update in a build step and scan offline with
`bundle-audit check --no-update`.

bundler-audit scans `Gemfile.lock` in the current directory and checks
two classes of issues ([github.com/rubysec/bundler-audit][ba-readme]):

1. Vulnerable gem versions - gem + version matched against ruby-advisory-db
   advisories with patched-version ranges.
2. Insecure sources - `http://` and `git://` source URIs that transmit
   without TLS.

Output flags ([github.com/rubysec/bundler-audit][ba-readme]):

| Flag | Output |
|---|---|
| (none) | Default human-readable text |
| `--format json` | JSON; suitable for multi-tool SCA triage |
| `--output FILE` | Write output to file instead of stdout |
| `--gemfile-lock PATH` | Scan a lockfile at a non-default path |

JSON + file example, useful as a CI artifact:

```bash
bundle-audit check --update --format json --output bundle-audit.json
```

## Suppress false positives

Per [github.com/rubysec/bundler-audit][ba-readme], create
`.bundler-audit.yml` at the project root and list advisory IDs to ignore:

```yaml
---
ignore:
  - CVE-2024-1234
  - GHSA-xxxx-yyyy-zzzz
```

The `ignore` array takes CVE, GHSA, or OSVDB identifiers, committed to
source control so suppressions are auditable in git history. Every ignore
needs an inline justification comment (reachability finding, approver,
re-review date); undocumented ignores are a code-smell reviewers should
treat as unapproved. The mandatory justification template, per-run
`--ignore` flags, and the quarterly re-review cadence are in
[references/bundle-audit-ci.md](references/bundle-audit-ci.md).

## Worked example

A Rails service locks `nokogiri 1.13.0` and `rack 2.2.3`. Run the scan:

```bash
bundle-audit check --update
```

bundler-audit flags two advisories and exits non-zero:

```
Name: nokogiri
Version: 1.13.0
CVE: CVE-2022-24836
Criticality: High
Title: Nokogiri ReDoS on crafted input
Solution: upgrade to >= 1.13.4

Name: rack
Version: 2.2.3
CVE: CVE-2022-30122
Criticality: Medium
Title: Denial of Service in Rack multipart parsing
Solution: upgrade to >= 2.2.3.1

Vulnerabilities found!
```

Because the exit code is non-zero, a CI job running this step fails. Triage
the two findings:

1. `nokogiri` is reachable (it parses user-supplied XML). Patch it -
   `bundle update nokogiri` to `1.13.4` - and the advisory clears.
2. `rack` multipart parsing is confirmed unreachable (the app rejects
   multipart requests at the edge). Suppress it with justification in
   `.bundler-audit.yml`:

```yaml
---
# Suppressions last reviewed: 2026-07-20 / Re-review by: 2026-10-20
ignore:
  # CVE-2022-30122: multipart parsing unreachable; app rejects multipart
  # requests at the edge. Verified via route audit. Approved: alice@example.com
  - CVE-2022-30122
```

Re-run offline (`bundle-audit check --no-update`): both findings resolved,
exit `0`, CI passes. Wire the gate into the pipeline per
[references/bundle-audit-ci.md](references/bundle-audit-ci.md).

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
- CI wiring (Rake + GitHub Actions), exit-code gating, and the full
  `.bundler-audit.yml` waiver template:
  [references/bundle-audit-ci.md](references/bundle-audit-ci.md)
- `npm-pip-maven-audit` - multi-ecosystem
  native audit dispatcher; covers `bundle audit` as one ecosystem among many
- `osv-scanner` - OSV.dev cross-DB scanner;
  pairs for cross-ecosystem consensus
- `snyk-test` - commercial SCA with Snyk DB
