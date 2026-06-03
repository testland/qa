---
name: kingfisher-scanning
description: "Configures and runs Kingfisher - MongoDB-built Rust-based secret scanner combining Intel Hyperscan regex engine with language-aware parsing; ships 950 built-in detection rules with **live secret validation** and offline checksum verification; multi-target (local files / Git history / GitHub / GitLab / AWS S3 / Docker images); browser-based report viewer; suppression via `--skip-regex` / `--skip-word` / `--baseline-file` / inline `kingfisher:ignore`. Use when the team needs the broadest rule coverage + Hyperscan performance, or wants the modern alternative to gitleaks/trufflehog."
rating: 23
d6: 4
---

# kingfisher-scanning

## Overview

Per [github.com/mongodb/kingfisher][kf-gh]:

[kf-gh]: https://github.com/mongodb/kingfisher

> "Kingfisher is an open source secret scanner and **live secret
> validation** tool built in Rust."

Three differentiating capabilities:

1. **Intel Hyperscan + language-aware parsing** - significantly
   faster than regex-only scanners on large repos.
2. **950 built-in rules** covering "cloud keys, AI tokens, CI/CD
   secrets, database credentials, and SaaS API keys" per
   [kf-gh][kf-gh]. Largest rule set of the three OSS scanners.
3. **Access mapping** - "Maps discovered credentials to their
   effective cloud identities and exposed resources." Beyond
   "is it a real secret?" → "what does this secret unlock?".

## When to use

- Large monorepo where gitleaks/trufflehog scan-time becomes
  blocking.
- Team prioritizes rule coverage over tool maturity (Kingfisher is
  newer than gitleaks/trufflehog).
- Cloud-heavy infrastructure where access mapping (which AWS
  identity does this leaked key represent?) is valuable.
- Modern Rust-toolchain shop where adopting Kingfisher fits stack
  preference.

For battle-tested defaults, [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md)
or [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md) are
lower-risk picks.

## Step 1 - Install

Per [kf-gh][kf-gh]:

```bash
# Homebrew (Linux/macOS)
brew install kingfisher

# PyPI via uv
uv tool install kingfisher-bin

# Install script (Linux/macOS)
curl -sSL https://raw.githubusercontent.com/mongodb/kingfisher/main/scripts/install-kingfisher.sh | bash

# Docker
docker run --rm -v "$PWD":/src ghcr.io/mongodb/kingfisher:latest scan /src
```

## Step 2 - Basic scan

Per [kf-gh][kf-gh]:

```bash
kingfisher scan /path/to/code --view-report
```

The `--view-report` flag opens results in the browser viewer
(useful for triage; less useful in CI).

For CI:

```bash
kingfisher scan /path/to/code --output kingfisher-report.json --format json
```

Multi-target scanning per [kf-gh][kf-gh]:

```bash
# Git history
kingfisher git /path/to/repo

# GitHub organization
kingfisher github --org=acme

# AWS S3
kingfisher s3 --bucket my-bucket

# Docker image
kingfisher docker my-image:latest
```

(Verify exact subcommand syntax against current Kingfisher release - 
the surface evolves.)

## Step 3 - Live validation

Per [kf-gh][kf-gh]: "Confirms discovered secrets against provider
APIs to reduce false positives."

Same model as TruffleHog's verification - discovered candidates are
tested against the provider API to confirm they're real,
unexpired credentials. The output distinguishes verified vs
unverified findings; CI gating typically uses verified-only for
PR-blocking.

Plus per [kf-gh][kf-gh]: "Validates tokens with built-in checksums
offline, eliminating many false positives." Some providers (AWS
keys, Stripe keys) include checksums that Kingfisher validates
without making API calls - fast + no audit-log impact.

## Step 4 - Access mapping (Kingfisher-distinctive)

Per [kf-gh][kf-gh]: "Maps discovered credentials to their effective
cloud identities and exposed resources."

When a leaked AWS key is discovered, Kingfisher can (with
appropriate permissions) report:

- The IAM user / role the key belongs to
- The IAM policies attached
- The actions the key can perform
- The resources the key can access

This turns a finding from "leaked AWS key" into "leaked AWS key
that could `s3:GetObject` from `prod-customer-data` bucket" - a
much sharper severity signal.

This requires Kingfisher to have read-only API access to the cloud
account; configure via standard cloud-SDK credential mechanisms.

## Step 5 - False-positive triage (MANDATORY)

Per [kf-gh][kf-gh] suppression options:

| Mechanism | Use |
|---|---|
| `--skip-regex '(?i)PATTERN'` | Skip matches matching a regex pattern |
| `--skip-word WORD` | Exclude specific words from detection |
| `--baseline-file <path>` | Suppress known findings tracked in a baseline |
| Inline `kingfisher:ignore` | In-code per-line suppression |

**Baseline workflow:**

```bash
# Create baseline (current state of findings)
kingfisher scan /path/to/code --output kingfisher-baseline.json

# Apply baseline (only NEW findings fail)
kingfisher scan /path/to/code --baseline-file kingfisher-baseline.json
```

**Justification template (mandatory in baseline file or sibling
REASONS.md):**

```yaml
# kingfisher-baseline-reasons.md
# Each entry in kingfisher-baseline.json should have an entry here.

GHSA-2024-aws-key-fixture:
  files: [tests/fixtures/aws-credentials.json]
  reason: "Test fixture; uses dummy AWS credentials for SDK init tests"
  approved-by: alice@example.com
  re-review-date: 2026-09-15
```

For inline:

```python
# kingfisher:ignore
# Reason: SDK initialization fixture; not a real credential
# Approved-by: alice@example.com
# Re-review-date: 2026-09-15
DUMMY_AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
```

Cadence: every quarter, audit `kingfisher-baseline-reasons.md` +
inline `kingfisher:ignore` comments; expired re-review dates removed.

## Step 6 - CI integration

Kingfisher is newer; first-party CI integrations are still maturing.
Pattern (verify against current docs):

```yaml
jobs:
  kingfisher:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - run: |
          curl -sSL https://raw.githubusercontent.com/mongodb/kingfisher/main/scripts/install-kingfisher.sh | bash
      - run: kingfisher scan . --baseline-file .kingfisher-baseline.json --format json --output kingfisher.json
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: kingfisher-report, path: kingfisher.json }
```

## Step 7 - Cross-tool layering

Three secret scanners in this plugin overlap deliberately:

| Tool | Sweet spot |
|---|---|
| gitleaks | Pre-commit (fastest, mature) |
| trufflehog | High-precision verified findings, multi-source |
| kingfisher | Largest rule set + access mapping; modern stack |

For maximum coverage, run all three in CI and combine output via a
unified triager. For minimum coverage, gitleaks (pre-commit) +
trufflehog (CI verified-only) is the conservative pick.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run kingfisher without baseline | Legacy findings flood PR | Baseline + diff (Step 5) |
| Suppress without REASONS doc | No audit trail | Mandatory template (Step 5) |
| Skip access-mapping config | Findings lack severity context | Configure cloud read-only access (Step 4) |
| Trust unverified findings as real | False positives drown signal | Verified-only filter (when supported by current version) |
| Pin to `kingfisher:latest` Docker tag | Breaking changes mid-release | Pin specific version (`v0.5.0` etc.) |

## Limitations

- Newer than gitleaks (2018) and trufflehog (2017); ecosystem
  smaller (fewer plugins, less StackOverflow coverage).
- Access mapping requires cloud read-only access - operational
  setup overhead.
- Hyperscan dependency (Intel x86) - limited ARM coverage in
  early releases (verify current support).
- Some custom-rule patterns require Rust-friendly regex (no
  PCRE-only features).

## References

- [kf-gh][kf-gh] - repository, install, scan commands, key features
- mongodb.com/blog (search "kingfisher") - release announcements
- [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md),
  [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md) - 
  sister scanners
- [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md) - 
  rotation workflow after detection
