---
name: renovate-config
description: "Reference for `renovate.json` - Mend Renovate dependency-update orchestrator (multi-platform: GitHub / GitLab / Bitbucket / Azure DevOps / Gitea); top-level keys (`extends` for preset references, `schedule`, `prConcurrentLimit`, `vulnerabilityAlerts`); `packageRules[]` array with `matchPackageNames` / `matchUpdateTypes` / `automerge` matching; `ignoreDeps`, `addLabels`, `automergeSchedule`. Use when authoring or reviewing Renovate configs in any repo platform Renovate supports."
---

# renovate-config

## Overview

Per [docs.renovatebot.com/configuration-options/][rn-cfg]:

[rn-cfg]: https://docs.renovatebot.com/configuration-options/

Renovate is the multi-platform alternative to Dependabot - supports
GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Forgejo. Configuration
via `renovate.json` at repo root (or `renovate.json5`,
`.renovaterc`, `package.json` `renovate` key, etc.).

This is a **reference skill** - defines the config
surface; doesn't run scans. Renovate complements SCA tools by
automating the upgrade PR.

## When to use

- The repo is on GitLab / Bitbucket / Azure DevOps (where Dependabot
  doesn't run).
- The repo is on GitHub but the team wants Renovate's richer
  preset + grouping model over Dependabot's simpler config.
- Authoring a new `renovate.json` from scratch.
- Reviewing a `renovate.json` PR for completeness + hygiene.

For GitHub-native simpler workflows, `dependabot-config`
is lower-friction.

## Step 1 - Top-level keys

Per [rn-cfg][rn-cfg]:

| Key | Use |
|---|---|
| `extends` | "References shareable config presets to avoid reinventing configuration wheels." |
| `schedule` | "Limit to these times of day or week" using cron-style syntax |
| `packageRules` | "Array of objects enabling conditional configuration. Supports `matchPackageNames`, `matchUpdateTypes`, `automerge`, and numerous other matching criteria." |
| `prConcurrentLimit` | "Caps concurrent pull request creation (defaults to 10)." |
| `vulnerabilityAlerts` | "Controls handling of security vulnerability alerts with strategy options." |
| `ignoreDeps` | "Array to exclude specific dependencies from updates." |
| `addLabels` | "All matched `addLabels` strings will be attached to the PR" (mergeable array) |
| `automergeSchedule` | "Restricts automerge operations to specified time windows." |

## Step 2 - Canonical example

Per [rn-cfg][rn-cfg]:

```json
{
  "extends": [":dependencyDashboard"],
  "schedule": ["before 3am on Monday"],
  "prConcurrentLimit": 5,
  "ignoreDeps": ["legacy-package"],
  "addLabels": ["dependencies"],
  "packageRules": [
    {
      "matchPackageNames": ["eslint"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    }
  ],
  "automergeSchedule": ["at any time"]
}
```

## Step 3 - Preset extension

Renovate's `extends` mechanism lets you import shared configurations:

```json
{
  "extends": [
    "config:recommended",
    "docker:enableMajor",
    ":dependencyDashboard",
    ":maintainLockFilesMonthly",
    "schedule:weekends"
  ]
}
```

Common built-in presets:

| Preset | Effect |
|---|---|
| `config:recommended` | Sensible defaults for most repos |
| `:dependencyDashboard` | Auto-creates a tracking issue summarizing pending/grouped updates |
| `:semanticCommitTypeAll(deps)` | Conventional-commit style: `deps(...): ...` |
| `:maintainLockFilesMonthly` | Refresh lockfiles monthly (npm-style) |
| `helpers:pinGitHubActionDigestsToSemver` | Pin GHA versions to digest+semver |
| `schedule:weekends` | Only open PRs on weekends |
| `group:allNonMajor` | One PR per ecosystem for all minor+patch updates |

Org-shared presets live in a separate repo (e.g., `acme/renovate-config`)
and are referenced via `extends: ["github>acme/renovate-config"]`.

## Step 4 - `packageRules` for fine-grained control

```json
{
  "packageRules": [
    {
      "description": "Auto-merge dev-dep patch + minor",
      "matchDepTypes": ["devDependencies"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "description": "Group all React ecosystem updates",
      "matchPackagePatterns": ["^@types/react", "^react"],
      "groupName": "react"
    },
    {
      "description": "Pin GitHub Actions to specific commit SHA",
      "matchManagers": ["github-actions"],
      "pinDigests": true
    },
    {
      "description": "Block React major upgrade until explicit greenlight",
      "matchPackageNames": ["react"],
      "matchUpdateTypes": ["major"],
      "enabled": false
    }
  ]
}
```

`packageRules` evaluate top-down; later rules override earlier
ones. Match conditions:

- `matchPackageNames` / `matchPackagePatterns` (regex)
- `matchDepTypes` (`dependencies`, `devDependencies`, `peerDependencies`, etc.)
- `matchUpdateTypes` (`major`, `minor`, `patch`, `pin`, `digest`)
- `matchManagers` (per package-manager: `npm`, `pip`, `cargo`, etc.)
- `matchCurrentVersion` (e.g., `<2.0.0`)
- `matchSourceUrlPrefixes` (block updates from forks)

## Step 5 - Vulnerability alerts handling

```json
{
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "automerge": true,
    "schedule": ["at any time"]
  }
}
```

Renovate listens to GitHub Security Advisories (or equivalent on
GitLab) and creates targeted PRs for vulnerability fixes. The
`vulnerabilityAlerts` block configures handling separately from
regular updates - typically more aggressive (auto-merge + immediate).

## Step 6 - Schedule syntax

Renovate uses [later.js](https://breejs.github.io/later/) cron
syntax + natural language:

```json
{
  "schedule": [
    "every weekend",
    "before 5am on the first day of the month",
    "after 9pm on Wednesday and Saturday"
  ]
}
```

Most teams use `["before 4am on Monday"]` for weekly batches.

## Step 7 - False-positive triage analogue

Renovate doesn't produce findings to triage - it produces upgrade
PRs. Suppression mechanisms:

| Mechanism | Use |
|---|---|
| `ignoreDeps: [...]` | Exclude specific packages globally |
| `packageRules` with `enabled: false` | Per-rule disable for specific match conditions |
| `osvVulnerabilityAlerts: false` (per-package) | Disable OSV-driven security PRs for one package |
| `enabled: false` at top-level | Pause Renovate entirely (last resort) |

**Justification template (mandatory in `renovate.json` JSON5 comments OR a co-located REASONS.md):**

```json5
{
  "packageRules": [
    {
      // Reason: react-router v7 incompatibility blocks react v19 upgrade
      // Approved-by: alice@example.com
      // Re-review-date: 2026-09-15 (re-evaluate when react-router v8 ships)
      "description": "Block React major upgrade",
      "matchPackageNames": ["react"],
      "matchUpdateTypes": ["major"],
      "enabled": false
    }
  ]
}
```

If using `renovate.json` (no comments), maintain a `RENOVATE_REASONS.md`
sibling file mapping each `enabled: false` rule to its reason +
re-review date.

Cadence: every quarter, audit `enabled: false` rules + ignoreDeps
entries; expired re-review dates removed.

## Step 8 - Self-hosted vs cloud

Two deployment modes:

| Mode | Setup |
|---|---|
| Mend Renovate (free SaaS for OSS / paid for orgs) | Install GitHub App from mend.io/renovate; no self-hosting |
| Self-hosted | Run `renovate` CLI in CI, scheduled via cron/scheduler |

Self-hosted example (GitLab CI):

```yaml
renovate:
  image: renovate/renovate
  schedule:
    - cron: "0 4 * * *"
  variables:
    RENOVATE_TOKEN: $RENOVATE_TOKEN
    LOG_LEVEL: info
  script:
    - renovate
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `extends: []` (no presets) | Re-implementing settled defaults; missing dashboard | Start with `config:recommended` (Step 3) |
| `prConcurrentLimit` too high (no limit) | PR storm overwhelms reviewers | Cap at 5 - 10 (Step 2) |
| Mass-`enabled: false` for noisy packages | Loses regression visibility | Use `groupName` to consolidate, not disable (Step 4) |
| Skip `RENOVATE_REASONS.md` for json (no comments) | No audit trail for blocked upgrades | Maintain reasons file or use `renovate.json5` (Step 7) |
| Auto-merge major updates | Breaking changes ship without review | Auto-merge minor + patch only (Step 4) |

## Limitations

- Renovate's config surface is large - full reference is 1000+
  options; team-shared presets reduce per-repo complexity.
- Self-hosted Renovate requires running infra; Mend's SaaS is the
  zero-ops path.
- JSON config doesn't support comments; use `renovate.json5` if
  comments matter for audit trail.
- Grouped PRs introduce coupling - one breaking change blocks the
  whole group.

## References

- [rn-cfg][rn-cfg] - official configuration options reference
- docs.renovatebot.com - full documentation
- docs.renovatebot.com/presets-config - built-in preset list
- mend.io/renovate - Mend Renovate (SaaS)
- github.com/renovatebot/renovate - repository
- `snyk-test`,
  `osv-scanner`,
  `dependabot-config`,
  `npm-pip-maven-audit` - 
  sister tools
