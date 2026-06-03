---
name: trufflehog-scanning
description: "Configures and runs TruffleHog v3 - secret scanner with **live verification** (validates discovered secrets against provider APIs to confirm actual exposure vs entropy false positive); supports per-source subcommands (`git`, `github`, `gitlab`, `filesystem`, `s3`, `docker`, `gcs`, `postman`); `--results=verified` filter for high-precision output; `--exclude-detectors=TYPE` for noise reduction; exits 183 on findings via `--fail`. Use when the team needs verified secret findings (low false-positive rate) or scans across cloud + repo + container surfaces."
rating: 23
d6: 4
---

# trufflehog-scanning

## Overview

Per [github.com/trufflesecurity/trufflehog][th-gh]:

[th-gh]: https://github.com/trufflesecurity/trufflehog

TruffleHog v3's distinguishing feature is **live verification** - 
discovered secrets are tested against the provider API to confirm
they're actual valid credentials. This dramatically reduces
false-positive rate vs entropy-only scanners.

The verification works for many cloud providers, SaaS APIs, and
custom-detector definitions. Filter to `--results=verified` to skip
unverified hits in CI gating.

## When to use

- Team needs low-FP-rate secret scanning (verification > entropy
  alone).
- Scanning beyond git: GitHub orgs, GitLab repos, S3 buckets,
  Docker images, Postman workspaces.
- Verified-only output for CI gating (block only confirmed-real
  secrets; track unverified separately).
- Layered with [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md)
  for cross-tool consensus.

## Step 1 - Install

Per [th-gh][th-gh]:

```bash
# Homebrew
brew install trufflehog

# Docker
docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest \
  github --repo https://github.com/trufflesecurity/test_keys

# Install script (Linux/macOS)
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh \
  | sh -s -- -b /usr/local/bin

# From source
git clone https://github.com/trufflesecurity/trufflehog.git
cd trufflehog && go install
```

## Step 2 - Per-source subcommands

Per [th-gh][th-gh] TruffleHog uses subcommands per data source:

| Subcommand | Use |
|---|---|
| `git` | Local Git repositories (full history) |
| `github` | GitHub orgs / repos (live API scan) |
| `gitlab` | GitLab repositories |
| `filesystem` | Local files / directories (no git) |
| `s3` | AWS S3 buckets |
| `docker` | Docker images (layered) |
| `gcs` | Google Cloud Storage |
| `postman` | Postman workspaces |

Examples per [th-gh][th-gh]:

```bash
# Scan git repository, verified only
trufflehog git https://github.com/trufflesecurity/test_keys --results=verified

# Scan GitHub organization with JSON output
trufflehog github --org=trufflesecurity --results=verified --json

# Scan local filesystem
trufflehog filesystem path/to/file1.txt path/to/dir
```

## Step 3 - Verification: the killer feature

Per [th-gh][th-gh]:

> "`--results=verified` - Show only credentials confirmed valid
> through API testing"

The verification flow per detector:
1. Regex match a candidate secret in source
2. Construct a provider-specific API call (e.g., AWS GetCallerIdentity)
3. If the call succeeds with the candidate as the credential,
   mark as verified
4. Filter the output by verification status

This is the difference between "high entropy string that LOOKS like
an AWS key" (probably a false positive) and "valid AWS key that
will let an attacker into your account" (definitely real).

**Trade-off:** verification calls can be detected by the provider
+ may generate audit-log entries. For compliance-sensitive scans,
disable via `--no-verification`.

## Step 4 - Output formats

Per [th-gh][th-gh]:

| Flag | Use |
|---|---|
| `--json` | Machine-readable JSON output |
| `--github-actions` | GitHub Actions annotation format |
| (default) | Human-readable text |

For [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md)
integration, use `--json --results=verified`:

```bash
trufflehog git . --json --results=verified > verified-secrets.json
```

## Step 5 - False-positive triage (MANDATORY)

TruffleHog has fewer false positives than entropy-only scanners
(thanks to verification), but unverified findings still need
triage:

| Mechanism | Use |
|---|---|
| `--results=verified` filter | Most aggressive: only confirmed-real secrets in output |
| `--exclude-detectors=TYPE,TYPE2` | Disable specific detectors (e.g., overly noisy ones) |
| `--include-detectors=TYPE,TYPE2` | Whitelist mode: ONLY listed detectors |
| `--no-verification` | Disable API calls (use entropy + regex only - more FPs) |
| `--exclude-paths=PATH_PATTERN` | Skip directories (vendor, generated code) |
| `--config=trufflehog.yaml` | YAML config for advanced control |

`trufflehog.yaml` example:

```yaml
detectors:
  - name: "AWS"
    enabled: true
  - name: "PrivateKey"
    enabled: true
  - name: "GenericAPIKey"
    enabled: false   # too noisy in this codebase

verification: true
exclude_paths:
  - "tests/fixtures/**"
  - "vendor/**"
```

**Justification template (mandatory in `trufflehog.yaml` comments
or sibling REASONS.md):**

```yaml
# Reason: GenericAPIKey detector produces 50+ FPs per scan in our codebase
#         (matches our own fingerprint hashes that look like keys but aren't).
# Approved-by: alice@example.com
# Re-review-date: 2026-09-15 (re-evaluate after fingerprint format migration)
detectors:
  - name: "GenericAPIKey"
    enabled: false
```

Cadence: every quarter, audit `trufflehog.yaml` disabled detectors
+ exclude_paths; expired entries removed.

## Step 6 - Failure semantics

Per [th-gh][th-gh]:

> "`--fail` - Exit with code 183 if secrets found"

Exit codes:
- `0` - no secrets found
- `183` - secrets found (with `--fail`)
- (other) - runtime errors

CI usage:

```bash
trufflehog git . --results=verified --fail
# Exit 183 if verified secrets found; exit 0 otherwise
# CI workflow fails the job on non-zero exit
```

## Step 7 - Pre-commit + CI integration

Pre-commit hook (community-supported, not first-party):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/trufflesecurity/trufflehog
    rev: v3.81.0
    hooks:
      - id: trufflehog
        args: ['--results=verified', '--fail']
```

GitHub Action:

```yaml
jobs:
  trufflehog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.pull_request.base.sha }}
          head: HEAD
          extra_args: --results=verified --fail
```

`base` + `head` enable diff-only scanning on PRs (faster).

## Step 8 - Cross-tool layering

Pair with [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md):
- gitleaks: faster, regex-based, runs in pre-commit
- trufflehog: slower (verification calls), high-precision, runs in
  CI

Run both in CI; gitleaks catches what didn't make it past
pre-commit; trufflehog catches what gitleaks missed (e.g., novel
formats not yet in gitleaks' rule library).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `--no-verification` in CI | Floods PR with FPs | Use `--results=verified` (Step 3) |
| Skip `--fail` flag | Exit code is 0 even with secrets; CI passes wrongly | Always `--fail` (Step 6) |
| Disable detectors without REASONS doc | No audit trail | Mandatory template (Step 5) |
| Verification on auth-rate-limited APIs | Triggers provider rate-limit alerts | `--no-verification` for those + accept FP risk |
| Skip diff-only scanning on PRs | Full repo scan slow on every PR | `base` + `head` flags (Step 7) |

## Limitations

- Verification API calls may trigger provider audit-log alerts
  (false positives in the security team's incident queue).
- Rate-limited APIs may slow scans or fail verification on
  large secret pools.
- Verification doesn't prove the secret hasn't been already
  rotated - a "valid" key per TruffleHog might be a recently-rotated
  legacy key still active for grace period.
- TruffleHog Enterprise (paid) has more detectors + features; the
  OSS version covers ~200 detectors.

## References

- [th-gh][th-gh] - repository, install, commands, exit codes
- trufflesecurity.com - company site
- [`gitleaks-scanning`](../gitleaks-scanning/SKILL.md),
  [`kingfisher-scanning`](../kingfisher-scanning/SKILL.md) - 
  sister scanners
- [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md) - 
  rotation workflow after detection
