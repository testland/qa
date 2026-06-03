---
name: gitleaks-scanning
description: "Configures and runs gitleaks - Go-based secret scanner with `gitleaks git` (scan local git via `git log -p`), `gitleaks dir` (filesystem), `gitleaks stdin` (pipe); 100+ built-in rules + custom rules in `.gitleaks.toml` ([[rules]] with regex / entropy / keywords / tags); allowlist via [[rules.allowlists]] (commits / paths / stopwords); pre-commit hook + GitHub Action integration; baseline file for legacy debt. Use when the team needs OSS secret scanning at commit time + CI gate."
rating: 23
d6: 4
---

# gitleaks-scanning

[gl-gh]: https://github.com/gitleaks/gitleaks

**Command-API note (v8.19.0+):** Per [gl-gh][gl-gh],
"v8.19.0 deprecated `detect` and `protect` commands, though they
remain available." Current scanning modes:

| Command | Use |
|---|---|
| `gitleaks git <repo>` | Scan local git repository using `git log -p` |
| `gitleaks dir <path>` | Scan directories and files (no git history) |
| `gitleaks stdin` | Stream data via pipe |

Use `git` for git-aware scans (fastest, history-rewinding); `dir`
for non-git (e.g., extracted CI artifact); `stdin` for diff-piping.

## When to use

- The team needs pre-commit + CI secret scanning.
- A migration from a private-repo-history audit (catch secrets
  ever committed; not just current state).
- Custom rule library for org-internal secret formats (internal
  API key prefixes, etc.).
- Layered with [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md)
  for live-validation cross-check.

## Step 1 - Install

Per [gl-gh][gl-gh]:

```bash
# Homebrew
brew install gitleaks

# Docker
docker pull zricethezav/gitleaks:latest
docker run -v ${PWD}:/path zricethezav/gitleaks:latest git /path

# From source
git clone https://github.com/gitleaks/gitleaks.git
cd gitleaks
make build
```

## Step 2 - Basic scans

```bash
# Scan current git repo (full history)
gitleaks git

# Scan a specific dir (no git)
gitleaks dir ./services/

# Stream + scan (e.g., scan a PR diff)
git diff main..HEAD | gitleaks stdin

# Output formats
gitleaks git --report-format json --report-path leaks.json
gitleaks git --report-format sarif --report-path leaks.sarif
gitleaks git --report-format csv --report-path leaks.csv
```

For PR-time scanning (faster - only check what changed):

```bash
gitleaks git --log-opts="origin/main..HEAD"
```

## Step 3 - `.gitleaks.toml` config

Per [gl-gh][gl-gh] config structure:

```toml
[[rules]]
id = "rule-identifier"
description = "rule description"
regex = '''regex-pattern'''
secretGroup = 3
entropy = 3.5
keywords = ["auth", "password"]
tags = ["tag1", "tag2"]

[[rules.allowlists]]
description = "ignore specific matches"
commits = ["commit-hash"]
paths = ['''file-path-regex''']
stopwords = ['''false-positive-term''']
```

Built-in rules cover AWS, GCP, Azure, GitHub, GitLab, Stripe,
Twilio, Slack, npm, PyPI, etc. Use `gitleaks <command> --no-banner`
to discover the full default rule list.

## Step 4 - Custom rule example

```toml
# .gitleaks.toml
[extend]
useDefault = true

[[rules]]
id = "internal-api-key"
description = "Internal API key (acme- prefix)"
regex = '''(?i)acme[_-]?api[_-]?key[_-]?[a-zA-Z0-9]{32}'''
secretGroup = 1
keywords = ["acme"]
tags = ["acme-internal"]

[[rules.allowlists]]
description = "Test fixtures"
paths = ['''tests/fixtures/.*\.json$''']

[[allowlists]]
description = "Project-wide allowlist (legacy commits)"
commits = ["abc1234", "def5678"]
paths = ['''vendor/.*''', '''third_party/.*''']
```

The `[extend] useDefault = true` keeps built-in rules; without it,
your custom rules replace the defaults entirely.

## Step 5 - False-positive triage (MANDATORY)

Suppression mechanisms in priority order:

| Mechanism | Where | When to use |
|---|---|---|
| `[[rules.allowlists]] paths` | `.gitleaks.toml` | Per-rule path exclusion (test fixtures, vendor) |
| `[[rules.allowlists]] commits` | `.gitleaks.toml` | Per-rule commit exclusion (historical false positive) |
| `[[allowlists]] paths` | `.gitleaks.toml` (top-level) | All-rule path exclusion |
| `--baseline-path` | CI flag | Legacy debt: only fail on NEW findings vs baseline |
| Inline `# gitleaks:allow` comment | Code | Single-line suppression |

**Baseline workflow (per [gl-gh][gl-gh]):**

```bash
# Create baseline
gitleaks git --report-path gitleaks-baseline.json

# Apply baseline (only new findings fail)
gitleaks git --baseline-path gitleaks-baseline.json --report-path findings.json
```

**Justification template (mandatory in `.gitleaks.toml`):**

```toml
[[rules.allowlists]]
description = """
Reason: tests/fixtures/* contains intentional dummy AWS credentials
        for SDK initialization tests; never used against real AWS.
Approved-by: alice@example.com
Re-review-date: 2026-09-15 (re-evaluate when SDK supports mock-mode injection)
"""
paths = ['''tests/fixtures/.*\.json$''']
```

Cadence: every quarter, audit `.gitleaks.toml` allowlist entries;
expired re-review-date entries removed.

## Step 6 - Pre-commit hook integration

Per [gl-gh][gl-gh]:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
```

Pre-commit prevents commits containing secrets from being created.
Faster local feedback than CI-only scanning.

## Step 7 - CI integration

Per [gl-gh][gl-gh]:

```yaml
# .github/workflows/gitleaks.yml
name: gitleaks
on: [pull_request, push]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }   # full history needed for git scan
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}   # for organizations
```

`fetch-depth: 0` is critical - without full git history, git-aware
scan only sees the latest commit.

## Step 8 - Rotation when a secret is found

Finding a leaked secret in git history is **not enough** - git
history is permanent (mirrored in clones, GitHub forks, archives).
The secret IS exposed. Workflow:

1. **Rotate immediately** - invalidate the leaked credential at
   the provider (AWS IAM key rotation, GitHub PAT revoke, etc.)
2. **Audit usage** - check provider audit logs for unauthorized
   use during the exposure window
3. **Document the incident** - track in postmortem (cross-ref
   [`post-mortem-author`](../../qa-process/skills/post-mortem-author/SKILL.md))
4. **Add the leaked-pattern to gitleaks** so future similar leaks
   are detected
5. **Optional: rewrite git history** (BFG Repo-Cleaner / git filter-repo) - but assume the secret IS exposed regardless

For automated rotation workflow, see [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `fetch-depth: 1` in CI | git-aware scan misses history; only catches new leaks | Always `fetch-depth: 0` (Step 7) |
| Allowlist without `Re-review-date` | Permanent debt | Mandatory template (Step 5) |
| Rely only on pre-commit (no CI) | Bypass `--no-verify`; CI is the catch-net | Both pre-commit AND CI (Steps 6 - 7) |
| Skip baseline; legacy findings block all PRs | Team disables gitleaks | `--baseline-path` (Step 5) |
| Find leak; assume git-history scrub fixes it | Leaked secret IS exposed; assume compromise | Rotate immediately (Step 8) |

## Limitations

- Regex + entropy can't catch all secret formats; pair with
  [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md)
  (live-validation) for higher precision.
- Rewriting git history is destructive + only effective if all
  copies are scrubbed (forks / clones / mirrors typically aren't).
- Custom rules require regex skill; complex secret formats
  (multi-line, base64-encoded) need careful authoring.
- `gitleaks` itself doesn't rotate secrets; that's the
  [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md)
  workflow.

## References

- [gl-gh][gl-gh] - repository, install, commands, config
- gitleaks.io - landing page
- [`trufflehog-scanning`](../trufflehog-scanning/SKILL.md),
  [`kingfisher-scanning`](../kingfisher-scanning/SKILL.md) - 
  sister scanners
- [`secrets-rotation-runner`](../secrets-rotation-runner/SKILL.md) - 
  build-an-X for rotation workflow after detection
