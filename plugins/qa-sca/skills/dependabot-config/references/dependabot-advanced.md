# Dependabot advanced config

Deep-dive material moved out of the SKILL.md spine: the full multi-ecosystem
`.github/dependabot.yml`, and the patch-only auto-merge workflow. All keys are
documented in the official configuration reference
(docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file).

## Full multi-ecosystem example

Every field here is optional except `package-ecosystem`, `directory`, and
`schedule.interval` (see SKILL.md Step 2). This expands the consolidated Step 4
example with per-ecosystem `groups`, `ignore`, `assignees`, and
`commit-message` customization.

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

## Patch-only auto-merge workflow

Dependabot creates PRs but doesn't auto-merge. Pair it with a workflow that
reads update metadata via `dependabot/fetch-metadata` and enables auto-merge
only for `version-update:semver-patch` (auto-merge still waits for required CI
to pass). Patch-only is safer than minor / major.

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
