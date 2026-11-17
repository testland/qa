---
name: gitleaks-scanning
description: "Use when a team needs open-source secret scanning on commits and in CI, or is adopting it on a repo with existing leaks: gitleaks git, dir and stdin scans, custom rules and allowlists in .gitleaks.toml, pre-commit and GitHub Action setup, baselines, and TruffleHog live verification."
---

# gitleaks-scanning

[gl-gh]: https://github.com/gitleaks/gitleaks
[gl-hooks]: https://github.com/gitleaks/gitleaks/blob/master/.pre-commit-hooks.yaml
[gl-stop]: https://github.com/gitleaks/gitleaks/blob/master/config/allowlist.go

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
- Layered with TruffleHog ([references/trufflehog.md](references/trufflehog.md))
  for live-validation cross-check.

## How to use

1. Install gitleaks (Step 1); confirm with `gitleaks version`.
2. Run a full-history baseline scan: `gitleaks git` (Step 2).
3. Add `.gitleaks.toml` with `[extend] useDefault = true` plus any
   org-internal custom rules (Step 3 - 4,
   [references/custom-rules-and-triage.md](references/custom-rules-and-triage.md)).
4. Triage findings: rotate real leaks, allowlist genuine
   false-positives with a `Re-review-date` (Step 5, references file).
5. Wire the pre-commit hook for fast local feedback (Step 6).
6. Add the CI job with `fetch-depth: 0` as the catch-net gate (Step 7).
7. On any confirmed leak, rotate the credential first, then scrub (Step 8).

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

Org-internal secret formats (internal API-key prefixes, etc.) go in
`[[rules]]` blocks. Set `[extend] useDefault = true` to keep the
built-in rules; without it, custom rules replace the defaults
entirely. Full example (custom rule + per-rule and top-level
allowlists) in
[references/custom-rules-and-triage.md](references/custom-rules-and-triage.md).

## Step 5 - False-positive triage (MANDATORY)

Suppress genuine false-positives with `[[rules.allowlists]]` (paths /
commits), the top-level `[[allowlists]]`, `--baseline-path` for legacy
debt, or an inline `# gitleaks:allow` comment. Every allowlist entry
needs a `Re-review-date`; audit them quarterly. The suppression
priority table and the justification template are in
[references/custom-rules-and-triage.md](references/custom-rules-and-triage.md).
Onboarding a repo that already has historical findings - baseline
snapshots, cross-tool suppression consistency with TruffleHog, waiver
pointers, and rot prevention - is in
[references/baseline.md](references/baseline.md).

## Step 5b - When gitleaks misses a secret

A scan that exits 0 is only as good as what it read. Per [gl-gh][gl-gh]:

| Missed leak | Why | Fix |
|---|---|---|
| Base64 value, e.g. a Kubernetes Secret's `data:` field, or a percent- or hex-encoded token | Decoding is off: for `--max-decode-depth` "the default value "0" means the feature is disabled by default". Supported: percent, hex (32+ chars), base64 (16+ chars). | `--max-decode-depth 3`; such findings carry `decoded:<encoding>` tags. |
| Secret inside a committed `.zip` or `.tar.gz` (fixtures, build output) | Archive traversal is off: for `--max-archive-depth` "The default value of "0" means this feature is disabled by default" (documented from v8.27.0). | `--max-archive-depth 2`, for `git` and `dir` scans. Inner paths show as `outer.zip!inner/.env`. |
| Files hidden by a broad path allowlist such as `(.*?)(json\|ya?ml)$` | Global `[[allowlists]]` "have a higher order of precedence than rule-specific allowlists" and skip every match. | List exact generated files (`package-lock\.json$`), or scope the allowlist to rules with `targetRules = [...]`. |
| A custom rule that never fires, with "invalid or unsupported Perl syntax" in the log | Rule regexes are Go RE2: "Golang's regex engine does not support lookaheads" (`(?=`, `(?!`). | Rewrite without lookarounds, e.g. `acme_(?:live\|test)_[A-Za-z0-9]{40}`, with `secretGroup` for the part to report. |
| Real secrets dropped by `stopwords` | Stopwords match as substrings of the lowercased secret ([allowlist.go][gl-stop]), so a short word such as `test` drops any secret that contains it. | Long, specific stopwords (`examplekey`), or a `regexes` allowlist anchored on the whole fake value. |
| A rule that is skipped before its regex runs | `keywords` are a pre-regex filter: a rule only runs where one of its keywords appears. | Keywords that are literally part of every match, such as the token prefix. |

**Prove the config before trusting it.** Feed fake values that match
each rule, in each shape that leaked, and expect exit code 1 (the
default `--exit-code` for leaks):

```bash
tok="acme_live_$(head -c 60 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 40)"
mkdir -p /tmp/glproof && cd /tmp/glproof && echo "token = \"$tok\"" > plain.txt
gitleaks dir plain.txt -c "$OLDPWD/.gitleaks.toml" -v; echo "exit=$?"         # expect 1
base64 -w0 plain.txt > encoded.txt
gitleaks dir encoded.txt -c "$OLDPWD/.gitleaks.toml" --max-decode-depth 2; echo "exit=$?"
zip -q bundle.zip plain.txt
gitleaks dir bundle.zip -c "$OLDPWD/.gitleaks.toml" --max-archive-depth 1; echo "exit=$?"
```

Never commit a real credential as a fixture; generate the fake at test
time, as above. Run the same proof without the new flags to see each
case pass silently, which shows the flag is what catches it.

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

The official hook runs `gitleaks git --pre-commit --redact --staged --verbose`
([.pre-commit-hooks.yaml][gl-hooks]). A hand-written `.git/hooks` script
should call the same command, not the deprecated `gitleaks protect --staged`.

Pre-commit gives fast local feedback, but anyone can skip it
(`git commit --no-verify`, or `SKIP=gitleaks` with the pre-commit
framework, as [gl-gh][gl-gh] documents). It is a convenience, never the
control; CI is.

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

### Make the CI gate hard to bypass

- **Ignore inline allows in the gate.** A `gitleaks:allow` comment on a
  line makes gitleaks skip it, and anyone can type one. Run CI with
  `--ignore-gitleaks-allow`; any secret an inline comment was hiding then
  fails and must be rotated.
- **Reviewed exceptions only.** Accepted false positives go in
  `.gitleaksignore` as finding `Fingerprint`s (`commit:file:rule-id:line`)
  or in a `--baseline-path` report, and the security team owns that file
  in `CODEOWNERS`, so a new exception needs their review.
- **Blocking, full range, redacted.** No `continue-on-error` or
  `|| true`; make the job a required status check; check out with
  `fetch-depth: 0` and pass the PR range in `--log-opts` so every commit
  in the PR is scanned (`--log-opts="-1"` reads only the last one); add
  `--redact` so logs and reports do not print the secret.
- **Current commands everywhere:** `gitleaks git` and `gitleaks dir`;
  `detect` and `protect` are deprecated since v8.19.0.

```yaml
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - name: gitleaks (every commit in the PR)
        run: |
          gitleaks git --redact --ignore-gitleaks-allow --max-decode-depth 3 \
            --log-opts="${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}" \
            --report-format sarif --report-path gitleaks.sarif
```

## Step 8 - Rotation when a secret is found

Finding a leaked secret in git history is **not enough** - git
history is permanent (mirrored in clones, GitHub forks, archives).
The secret IS exposed. Workflow:

1. **Rotate immediately** - invalidate the leaked credential at
   the provider (AWS IAM key rotation, GitHub PAT revoke, etc.)
2. **Audit usage** - check provider audit logs for unauthorized
   use during the exposure window
3. **Document the incident** - track in postmortem (cross-ref
   `post-mortem-author` in the qa-process plugin)
4. **Add the leaked-pattern to gitleaks** so future similar leaks
   are detected
5. **Optional: rewrite git history** (BFG Repo-Cleaner / git filter-repo) - but assume the secret IS exposed regardless

For automated rotation workflow, see `secrets-rotation-runner`.

## Worked example

A team enables gitleaks on a 4-year-old private repo.

1. First full-history scan writes 3 hits:
   `gitleaks git --report-format json --report-path leaks.json`.
2. Two are real - an AWS access key in commit `abc1234` and a Slack
   token in a since-deleted config. Both are rotated at the provider
   (Step 8), and provider audit logs are checked for misuse.
3. One is a dummy AWS key under `tests/fixtures/aws.json`. It gets a
   `[[rules.allowlists]]` path entry with an `Approved-by` and a
   `Re-review-date` (references file).
4. The rotated-but-still-in-history hits are captured as a baseline
   (`gitleaks git --report-path gitleaks-baseline.json`), and CI runs
   `--baseline-path gitleaks-baseline.json` so only NEW leaks fail.
5. A pre-commit hook (Step 6) and a `fetch-depth: 0` CI job (Step 7)
   are added. The next PR that pastes a live Stripe key is blocked at
   commit time and again in CI.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `fetch-depth: 1` in CI | git-aware scan misses history; only catches new leaks | Always `fetch-depth: 0` (Step 7) |
| Allowlist without `Re-review-date` | Permanent debt | Mandatory template (Step 5) |
| Rely only on pre-commit (no CI) | Bypass `--no-verify`; CI is the catch-net | Both pre-commit AND CI (Steps 6 - 7) |
| Skip baseline; legacy findings block all PRs | Team disables gitleaks | `--baseline-path` (Step 5) |
| Find leak; assume git-history scrub fixes it | Leaked secret IS exposed; assume compromise | Rotate immediately (Step 8) |
| Trust a green scan without decoding or archives | Base64 and zipped secrets pass at the default depth 0 | `--max-decode-depth`, `--max-archive-depth` (Step 5b) |
| Broad global path allowlist (`json`, `yaml`) | Hides every config file, Kubernetes Secrets included | Exact paths or `targetRules` (Step 5b) |
| `gitleaks:allow` honoured in CI | Anyone can silence the gate | `--ignore-gitleaks-allow`; `.gitleaksignore` under CODEOWNERS (Step 7) |
| `continue-on-error` or `--log-opts=-1` in the PR job | Never blocks; scans one commit | Required check, base..head range (Step 7) |

## Limitations

- Regex + entropy can't catch all secret formats; pair with
  TruffleHog live validation ([references/trufflehog.md](references/trufflehog.md)) for higher precision.
- Rewriting git history is destructive + only effective if all
  copies are scrubbed (forks / clones / mirrors typically aren't).
- Custom rules require regex skill; complex secret formats
  (multi-line, base64-encoded) need careful authoring.
- `gitleaks` itself doesn't rotate secrets; that's the
  `secrets-rotation-runner`
  workflow.

## References

- [gl-gh][gl-gh] - repository, install, commands, config, decoding,
  archive scanning, `gitleaks:allow`, `.gitleaksignore`, exit codes
- [gl-hooks][gl-hooks] - official pre-commit hook command
- [gl-stop][gl-stop] - allowlist source: stopwords are substring matches
- gitleaks.io - landing page
- Baseline management for legacy findings:
  [references/baseline.md](references/baseline.md)
- [references/trufflehog.md](references/trufflehog.md) - TruffleHog, the live-verification layer
- `secrets-rotation-runner` - 
  build-an-X for rotation workflow after detection
