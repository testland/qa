---
name: codeclimate-config
description: "Configure Code Climate Quality (now Qlty) for repository-wide quality gates - duplication, complexity, similar-code, exclude_patterns. Covers both legacy `.codeclimate.yml` (Code Climate Velocity / GitHub integration) and the new `.qlty/qlty.toml` per the Qlty platform migration. Use when a repo needs duplication and complexity thresholds enforced on PRs, or when an existing `.codeclimate.yml` must be migrated to Qlty without losing its plugin and exclude settings."
metadata:
  keywords: "code-climate, qlty, duplication, complexity, quality-gate"
---

# codeclimate-config

Code Climate Quality has rebranded as **Qlty** (the docs.codeclimate.com
URL now 301-redirects to docs.qlty.sh per the [Qlty docs]). This skill
configures both:

1. **Legacy `.codeclimate.yml`** - still consumed by Code Climate
   Velocity SaaS + GitHub Code Climate App for teams that haven't
   migrated.
2. **New `.qlty/qlty.toml`** - Qlty platform format with `[[plugin]]` /
   `[[source]]` sections.

## When to use

- Teams adopting an "issues-on-PR" automated review tool.
- Adding duplication-mass / cyclomatic-complexity guards to CI without
  hand-rolling thresholds.
- Migrating off legacy Code Climate Quality to Qlty without losing
  config.

## Step 1 - Install (Qlty CLI path)

```bash
# macOS / Linux
curl https://qlty.sh -o install-qlty.sh
sh install-qlty.sh

# Windows (PowerShell)
powershell -c "iwr https://qlty.sh | iex"
```

Per the [Qlty quickstart], CLI verifies via `gh attestation verify` if
downloaded from GitHub releases.

## Step 2 - Initialize config

```bash
qlty init
```

Generates `.qlty/qlty.toml` baseline scoped to detected file types.

## Step 3 - Legacy `.codeclimate.yml`

For teams still on the GitHub Code Climate App:

```yaml
version: "2"
plugins:
  duplication:
    enabled: true
    config:
      languages:
        javascript:
          mass_threshold: 50
        python:
          mass_threshold: 32
        ruby:
          mass_threshold: 18
  fixme:
    enabled: true
  structure:
    enabled: true
exclude_patterns:
  - "config/"
  - "db/"
  - "dist/"
  - "features/"
  - "**/node_modules/"
  - "script/"
  - "**/spec/"
  - "**/test/"
  - "**/tests/"
  - "**/vendor/"
  - "**/*_test.go"
  - "**/*.d.ts"
```

**Excluding `**/test/**` is required** - 
qa-test-review owns test-code hygiene; qa-code-quality scopes
production only.

## Step 4 - Qlty `.qlty/qlty.toml`

Per the [Qlty quickstart] structure:

```toml
config_version = "0"

[[source]]
name = "default"
default = true

[[plugin]]
name = "eslint"

[[plugin]]
name = "ruff"

[[plugin]]
name = "shellcheck"

# Per-tool exclude patterns
[[exclude]]
file_patterns = [
  "node_modules/**",
  "dist/**",
  "**/*.test.ts",
  "**/*.spec.ts",
  "tests/**",
  "vendor/**",
]
```

Discover available plugins:

```bash
qlty plugins list
qlty plugins enable eslint
```

## Step 5 - Run analysis

```bash
# Lint changed files (default)
qlty check

# Lint everything
qlty check --all

# Just one tool
qlty check --all --filter=shellcheck

# Detect smells (duplication + complexity)
qlty smells --all

# Export top-complexity hotspots
qlty metrics --all --max-depth=2 --sort complexity --limit 10
```

Verify: assert `qlty smells --all` returns a manageable count before
wiring the gate. If it surfaces excess pre-existing issues, raise the
per-language `mass_threshold` or scope with `qlty check --upstream main`,
then re-run.

## Step 6 - CI gate

```yaml
# GitHub Actions
- name: Qlty install
  run: curl https://qlty.sh -o install-qlty.sh && sh install-qlty.sh

- name: Qlty check
  run: qlty check --upstream main
  env:
    QLTY_TOKEN: ${{ secrets.QLTY_TOKEN }}
```

`--upstream main` scopes results to **only the diff** vs main - 
matches the "new issues only" workflow Qlty's PR feedback uses
(per [Qlty docs] section "Preventing new issues from merging").

Verify: run `qlty check --upstream main` locally (or open a test PR) and
assert a newly introduced duplicate block fails while pre-existing
findings stay green. If pre-existing issues also fail, confirm
`--upstream main` is set and the base branch is correct, then re-run.

## Worked example

A team runs a JS + Python monorepo with a legacy `.codeclimate.yml`
(duplication `mass_threshold` 50 for javascript, 32 for python) and wants
PR-scoped gating on Qlty.

1. Install the CLI and run `qlty init` - it writes a baseline
   `.qlty/qlty.toml` scoped to the detected file types.
2. Run `qlty config migrate` to carry the legacy duplication thresholds and
   `exclude_patterns` into `qlty.toml`, then enable the linters:
   `qlty plugins enable eslint` and `qlty plugins enable ruff`.
3. Add an `[[exclude]]` block with `tests/**`, `node_modules/**`, `dist/**`,
   and `vendor/**` so deliberate test-code repetition (owned by
   qa-test-review) never trips duplication checks.
4. Run `qlty smells --all` on the brownfield repo - it surfaces hundreds of
   pre-existing duplications. Instead of blocking every PR, scope the gate
   with `qlty check --upstream main` so only new-diff issues fail.
5. Wire that command into CI with `QLTY_TOKEN` set. A PR that introduces a
   new duplicate block in `src/` now fails the gate, while the pre-existing
   findings stay green.

Result: production code gets duplication and complexity gating on the diff
only, tests are excluded, and the legacy `.codeclimate.yml` migrates to
`qlty.toml` without losing its thresholds.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Scan tests + production with same thresholds | Tests fail duplication checks (deliberate AAA repetition); team disables tool | Exclude `**/tests/**`, `**/spec/**` (Steps 3 - 4) |
| Set duplication `mass_threshold` to default in brownfield | Hundreds of pre-existing duplications block all PRs | Use `--upstream` diff scope OR raise threshold initially + ratchet down |
| Mix legacy `.codeclimate.yml` + new `.qlty/qlty.toml` | Both tools find different issues; PR comments contradict | Pick one platform; legacy `.codeclimate.yml` is consumed by Code Climate Velocity / GitHub App, `.qlty/qlty.toml` by Qlty CLI |
| Enable every plugin upfront | Noisy first PR scares team | Start with 2-3 plugins; add quarterly |
| Run only post-merge | No PR feedback loop | Run on PR (Step 6) |

## Limitations

- Code Climate Velocity remains a SaaS dashboard; some legacy
  features (Test Coverage, Engineering Analytics) sunset on
  migration to Qlty.
- The `.codeclimate.yml` `engines:` syntax (v1) is deprecated; use
  `plugins:` (v2) per the schema in this skill.

## References

- [Qlty docs] - platform overview, plugin catalog, exclusion patterns
- [Qlty quickstart] - install, init, check, smells commands
- [Qlty migration guide] - `.codeclimate.yml` to `qlty.toml` mapping,
  performed by `qlty config migrate`

[Qlty docs]: https://docs.qlty.sh/
[Qlty quickstart]: https://docs.qlty.sh/cli/quickstart
[Qlty migration guide]: https://docs.qlty.sh/migration/guide
