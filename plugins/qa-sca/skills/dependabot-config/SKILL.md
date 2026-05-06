---
name: dependabot-config
description: Reference for `.github/dependabot.yml` — GitHub-native dependency-update orchestrator. Required keys (`version: 2`, `updates[]` array) plus per-update fields (`package-ecosystem`, `directory` / `directories`, `schedule.interval`); common optional fields (`ignore`, `groups`, `allow`, `labels`, `milestone`, `open-pull-requests-limit`, `target-branch`, `vendor`, `versioning-strategy`, `assignees`, `commit-message`); auto-rebase + grouped-PR + security-only updates. Use when authoring or reviewing Dependabot configs in GitHub-hosted repos.
rating: 22
d6: 4
archetype: S2
---

# dependabot-config

## Overview

Per [docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file][db-cfg]:

[db-cfg]: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

Dependabot is GitHub's native dependency-update orchestrator. It
opens PRs (or issues, for security-only) when a new version is
available for a declared dependency. Configuration via
`.github/dependabot.yml` at repo root.

This is a **reference skill** (S2 archetype) — defines the config
surface; doesn't run scans (that's [`snyk-test`](../snyk-test/SKILL.md)
or [`osv-scanner`](../osv-scanner/SKILL.md)). Dependabot complements
SCA tools by automating the upgrade PR.

## When to use

- The repo is GitHub-hosted (Dependabot is GitHub-native).
- Authoring a new `.github/dependabot.yml`.
- Reviewing a `.github/dependabot.yml` PR for completeness +
  hygiene.
- Migrating from manual update sweeps to automated orchestration.

For non-GitHub repos, see [`renovate-config`](../renovate-config/SKILL.md).

## Step 1 — Top-level structure

Per [db-cfg][db-cfg]:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
```

Required top-level keys:

| Key | Use |
|---|---|
| `version` | Always `2` (only supported version) |
| `updates` | Array of per-ecosystem update configurations |

## Step 2 — Per-update required fields

Per [db-cfg][db-cfg]:

| Field | Use |
|---|---|
| `package-ecosystem` | Package manager: `npm`, `bundler`, `cargo`, `composer`, `docker`, `github-actions`, `gitsubmodule`, `gomod`, `gradle`, `maven`, `mix`, `nuget`, `pip`, `pub`, `swift`, `terraform` |
| `directory` (or `directories`) | Manifest location relative to repo root |
| `schedule.interval` | Frequency: `daily` / `weekly` / `monthly` / `quarterly` / `semiannually` / `yearly` / `cron` (with cron expression) |

`directories` (plural) supports an array for monorepos:

```yaml
- package-ecosystem: "npm"
  directories:
    - "/services/api"
    - "/services/worker"
    - "/packages/shared"
```

## Step 3 — Common optional fields

Per [db-cfg][db-cfg]:

### `ignore`

> "Ignore updates for dependencies with matching names, optionally
> using `*` to match zero or" more characters.

```yaml
ignore:
  - dependency-name: "lodash"
    versions: [">=5.0.0"]    # don't update past v5
  - dependency-name: "*-internal-*"
    update-types: ["version-update:semver-major"]
```

### `groups`

> "Combines multiple dependency updates into single pull requests
> using pattern matching and dependency type filters."

```yaml
groups:
  dev-deps:
    dependency-type: "development"
    update-types: ["minor", "patch"]
  production-deps:
    dependency-type: "production"
    exclude-patterns: ["express*", "fastify*"]
```

Grouped PRs reduce review noise — instead of 30 individual PRs for
dev-deps, get one consolidated PR.

### `allow`

> "Restricts updates to explicitly listed dependencies only."

```yaml
allow:
  - dependency-name: "react*"
  - dependency-type: "direct"
```

Use carefully — overly-narrow `allow` lists silently drop coverage
of newly-added deps.

### Other common fields

| Field | Use |
|---|---|
| `labels` | Custom PR labels (overrides default `dependencies`) |
| `milestone` | Numeric milestone ID for created PRs |
| `open-pull-requests-limit` | Max concurrent version PRs (default 5; security-only PRs not counted) |
| `target-branch` | Update target branch (security PRs always go to default branch) |
| `vendor` | Maintain vendored deps (Bundler, Go modules) |
| `versioning-strategy` | `auto` / `strict` / `increase-if-necessary` / `widen-ranges` |
| `assignees` | GitHub usernames for assignment |
| `commit-message` | Customize prefix + scope |

## Step 4 — Realistic multi-ecosystem example

```yaml
version: 2
updates:
  # Application dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "UTC"
    open-pull-requests-limit: 10
    groups:
      dev-deps:
        dependency-type: "development"
        update-types: ["minor", "patch"]
      production-minor-patch:
        dependency-type: "production"
        update-types: ["minor", "patch"]
    ignore:
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
    labels: ["dependencies", "javascript"]
    assignees: ["alice"]
    commit-message:
      prefix: "deps"
      include: "scope"

  # CI workflow updates
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    groups:
      gha:
        patterns: ["*"]
    labels: ["dependencies", "ci"]

  # Docker base image updates
  - package-ecosystem: "docker"
    directory: "/Dockerfile"
    schedule:
      interval: "weekly"
    labels: ["dependencies", "docker"]
```

## Step 5 — Security updates (always-on)

Dependabot security updates are **enabled separately** in
repo settings (Security → Code security and analysis → Dependabot
security updates). Security PRs:

- Always target the default branch (regardless of `target-branch`)
- Don't count against `open-pull-requests-limit`
- Trigger immediately on CVE disclosure (not on schedule)
- Bypass `ignore` rules for the affected version (you can ignore
  the package generally, but Dependabot will still PR a security
  fix unless you explicitly ignore the CVE)

## Step 6 — False-positive triage analogue

Dependabot doesn't produce findings to triage — it produces upgrade
PRs. The "FP triage" analogue is **suppressing unwanted update PRs**:

| Mechanism | Use |
|---|---|
| `ignore.dependency-name` + `versions` range | Pin a dep to a major version (avoid breaking changes) |
| `ignore.update-types` | Block all major-version PRs for a dep |
| Repo Settings → Security → Disable Dependabot for a specific package | Categorical disable (last resort) |

**Justification template (mandatory in `dependabot.yml` comments):**

```yaml
ignore:
  # Reason: react v19 + react-router v7 incompatibility blocks upgrade
  # Approved-by: alice@example.com
  # Re-review-date: 2026-09-15 (re-evaluate when react-router v8 ships)
  - dependency-name: "react"
    update-types: ["version-update:semver-major"]
```

Cadence: every quarter, audit `ignore:` entries; expired re-review
dates removed.

## Step 7 — Auto-merge integration

Dependabot creates PRs but doesn't auto-merge. For auto-merge,
pair with GitHub Auto-merge or a workflow:

```yaml
# .github/workflows/dependabot-automerge.yml
name: Dependabot auto-merge
on: pull_request

permissions:
  pull-requests: write
  contents: write

jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - uses: dependabot/fetch-metadata@v2
        id: meta
      - if: steps.meta.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Auto-merge only after CI passes; gates auto-merge to patch updates
(safer than minor / major).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `interval: "daily"` everywhere | PR storm overwhelms reviewers | `weekly` for non-critical; `daily` only for security-sensitive deps |
| No `groups:` for dev deps | Each dev-dep update is a separate PR | Group by dependency-type (Step 3) |
| `ignore` without expiration comment | Permanent debt | Mandatory `Re-review-date:` (Step 6) |
| Skip security-only updates feature (or disable in Settings) | Critical CVEs reach prod | Keep enabled; never disable wholesale |
| Auto-merge minor/major automatically | Breaking changes ship without review | Auto-merge patch only (Step 7) |

## Limitations

- GitHub-only — for GitLab / Bitbucket / non-GitHub, use
  [`renovate-config`](../renovate-config/SKILL.md).
- No support for non-language manifests (Helm Chart.yaml,
  pre-commit hook updates, etc.) without workarounds.
- Grouped PRs introduce coupling — one breaking change blocks the
  whole group.
- Per-CVE waivers (vs per-version-range) are not first-class; the
  `ignore` mechanism is dependency-centric.

## References

- [db-cfg][db-cfg] — official configuration reference
- docs.github.com/en/code-security/dependabot — full Dependabot docs
- docs.github.com/en/code-security/dependabot/dependabot-security-updates
  — security updates feature
- github.com/dependabot/fetch-metadata — auto-merge helper
- [`snyk-test`](../snyk-test/SKILL.md),
  [`osv-scanner`](../osv-scanner/SKILL.md),
  [`renovate-config`](../renovate-config/SKILL.md),
  [`npm-pip-maven-audit`](../npm-pip-maven-audit/SKILL.md) —
  sister tools
- [`sca-prioritizer`](../../agents/sca-prioritizer.md) — unifier agent
