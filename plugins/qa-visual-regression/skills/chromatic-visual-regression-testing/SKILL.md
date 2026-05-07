---
name: chromatic-visual-regression-testing
description: "Authors and runs Chromatic visual tests on Storybook, Playwright, or Cypress projects via the `chromatic` CLI; configures baselines, TurboSnap, UI Review, and CI gating; reads exit codes for change-vs-error classification. Use when the project ships visual regression coverage to Chromatic Cloud."
rating: 26
d6: 4
archetype: S1
---

# chromatic-visual-regression-testing

## Overview

Chromatic is a visual testing platform built by the team behind Storybook
([chromatic-overview][overview]). It works in three modes:

- **Storybook (default):** every story becomes a snapshot.
- **Playwright:** snapshots are captured during Playwright test runs via
  the `--playwright` flag.
- **Cypress:** snapshots are captured during Cypress runs via
  `--cypress`.

[overview]: https://www.chromatic.com/docs/

The CLI shape: `chromatic` is one binary; everything (auth, framework
choice, TurboSnap) is a flag or env var.

## When to use

- The project uses Storybook and wants a hosted UI for visual review with
  team sign-off on baseline changes.
- The team needs **TurboSnap** — a per-PR speedup that snapshots only
  stories whose dependency graph changed ([turbosnap][turbosnap]).
- The repo already has `chromatic` in `devDependencies` or a
  `chromatic.config.json` at the root.
- Visual coverage is story-driven, not full-page-driven (in contrast to
  Percy or Playwright snapshots, which are page-driven by default).

[turbosnap]: https://www.chromatic.com/docs/turbosnap/

## Authoring

### Install

```bash
npm install --save-dev chromatic
```

(Per the [Chromatic quickstart][quickstart].)

[quickstart]: https://www.chromatic.com/docs/quickstart/

### Connect to a project

The first run uploads the Storybook build, captures a snapshot of each
story, and **establishes those snapshots as the project baseline**
([quickstart][quickstart]):

```bash
npx chromatic --project-token <your-project-token>
```

Subsequent runs compare new snapshots to the baseline; visual changes
must be **explicitly accepted** in the Chromatic UI before the build
passes.

### Authoring stories (Storybook mode)

Chromatic snapshots whatever your Storybook indexes, so authoring is
"add a story." Per-story knobs that affect snapshots are passed in the
story's `parameters.chromatic` block (e.g. `viewports`, `delay`, `pauseAnimationAtEnd`).

### Authoring tests (Playwright / Cypress mode)

When invoked with `--playwright` or `--cypress`, the CLI captures
snapshots from your existing Playwright / Cypress test runs
([cli][cli]); no per-test code changes are required beyond running the
matching framework's archive output through Chromatic.

[cli]: https://www.chromatic.com/docs/cli/

## Running

### CLI invocation

The canonical invocation in CI, with the token sourced from an env var
([cli][cli]):

```bash
export CHROMATIC_PROJECT_TOKEN=<token>
npx chromatic
```

Useful flags ([cli][cli]):

| Flag                     | Effect |
|--------------------------|--------|
| `--project-token <t>`    | Override the token (env var preferred). |
| `--playwright`           | Capture from Playwright runs instead of Storybook. |
| `--cypress`              | Capture from Cypress runs instead of Storybook. |
| `--only-changed`         | Enable TurboSnap (snapshot only stories affected by changed files). |
| `--only-story-names`     | Run a build limited to specific story names. |
| `--auto-accept-changes`  | Auto-accept changes on the named branch (typically used on `main` for the first run after a planned UI overhaul). |
| `--exit-zero-on-changes` | Exit `0` on visual changes (still uploads, but the CI step doesn't fail). |
| `--exit-once-uploaded`   | Return as soon as the upload completes; do not wait for the snapshot pass. |
| `--dry-run`              | Skip publishing; useful for local debugging. |
| `--no-interactive`       | CI-style logging when running locally. |
| `--trace-changed`        | Show the TurboSnap dependency tree (debug). |
| `--list`                 | Print the indexed stories without running them. |
| `--debug`                | Verbose logging. |
| `--diagnostics-file <p>` | Write a JSON diagnostics dump for support. |

### Configuration file

`chromatic.config.json` at the project root — config keys mirror the CLI
flags converted to `kebab-case` ([cli][cli]):

```json
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "onlyChanged": true,
  "exitZeroOnChanges": false,
  "autoAcceptChanges": "main",
  "externals": ["public/**", "tokens/**"]
}
```

`externals` lists glob patterns of non-bundled files that should still
trigger a TurboSnap rebuild when changed (e.g. design tokens, static
assets) ([turbosnap][turbosnap]).

## Reading exit codes

Per the [Chromatic CLI docs][cli], exit codes carry semantic meaning —
the gate logic should treat *visual changes* (1) differently from
*system errors* (3, 21–23, 101–105, 201–220):

| Code     | Meaning                                       |
|---------:|-----------------------------------------------|
| `0`      | Success.                                      |
| `1`      | Build has visual changes (review required).   |
| `2`      | Build has component (Storybook) errors.       |
| `3`      | Build failed (system error).                  |
| `4`      | No stories found.                             |
| `5`–`6`  | Build limited / canceled.                     |
| `11`–`12`| Account quota / payment issues.               |
| `21`–`23`| Storybook build / load failures.              |
| `101`–`105` | Git or dependency issues.                  |
| `201`–`220` | Network / API errors.                      |
| `254`–`255` | Invalid options / unknown error.           |

Use `--exit-zero-on-changes` only when changes are reviewed in the
Chromatic UI (not in CI) and you want CI to remain green pending
review.

## TurboSnap

TurboSnap analyzes git history and the bundler dependency graph to
identify stories affected by a PR's changes; only those stories are
snapshotted, and the rest copy their baseline forward ([turbosnap][turbosnap]).

Enable via `--only-changed` (CLI) or `onlyChanged: true`
(`chromatic.config.json`).

### Bundler requirements

- **Webpack:** Chromatic reads the stats file emitted by Webpack.
- **Vite:** Vite also supplies a compatible dependency graph.

(Per [turbosnap][turbosnap].)

### Full-rebuild triggers

TurboSnap conservatively snapshots **everything** when any of these
change ([turbosnap][turbosnap]):

- `package.json` changes without a valid lockfile.
- Storybook config (`main.js`, `manager.js`).
- `preview.js` imports.
- Static folders.
- Infrastructure upgrades (Storybook major version, etc.).

Merge commits also trigger conservative re-testing because TurboSnap
cannot know ahead of time which baseline side to compare against
([turbosnap][turbosnap]).

## CI integration

The minimal pattern is: install `chromatic`, expose
`CHROMATIC_PROJECT_TOKEN` as a CI secret, run the CLI, fail the job on
exit `!= 0` (or `!= 0,1` if review happens in the Chromatic UI).

```yaml
# .github/workflows/chromatic.yml
name: chromatic

on:
  pull_request:
  push:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # required by TurboSnap

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Build Storybook + run Chromatic
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: npx chromatic --only-changed
```

`fetch-depth: 0` is required so TurboSnap can resolve the
PR-vs-baseline commit ancestry ([turbosnap][turbosnap]).

## References

- [chromatic-overview][overview] — product overview, framework support.
- [chromatic-quickstart][quickstart] — install + first-run baseline.
- [chromatic-cli][cli] — full CLI flag set + exit codes + config schema.
- [chromatic-turbosnap][turbosnap] — TurboSnap mechanism, full-rebuild
  triggers, bundler requirements.
