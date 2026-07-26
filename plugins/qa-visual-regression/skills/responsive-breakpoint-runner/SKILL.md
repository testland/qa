---
name: responsive-breakpoint-runner
description: "Produces a single breakpoint-matrix report (rows = pages/stories, columns = viewports) across Percy, Chromatic, Playwright snapshots, or Storybook test-runner. Routes per-engine viewport syntax, runs each, and aggregates the results into one cross-breakpoint view. Use when the team needs one unified pass/fail view across three or more viewport widths instead of separate per-engine or per-breakpoint reports. The matrix-view output is the distinguishing trait: it dispatches to playwright-snapshots (and the other engines) rather than replacing any single-engine skill."
---

# responsive-breakpoint-runner

## Overview

Most teams need to assert a UI across multiple breakpoints (mobile,
tablet, desktop, sometimes wide-desktop). The four engines covered
here each have their own way to express a viewport list:

- **Percy** - widths array in `.percy.yml` / `.percy.config.js`.
- **Chromatic** - `parameters.chromatic.viewports` per story.
- **Playwright snapshots** - one `project` per breakpoint in
  `playwright.config.ts`.
- **Storybook test-runner** - Storybook viewport addon parameters
  consumed in a `preVisit` hook.

This skill is a dispatcher: pick the engine the project already runs,
follow the matching pattern, then aggregate into a single breakpoint
report. **It does not replace any engine** - it composes the plugin's
per-engine skills. The per-engine viewport syntax lives in
[references/engine-viewport-syntax.md](references/engine-viewport-syntax.md).

## When to use

- The UI ships at three or more breakpoints (typical: 375 / 768 / 1280;
  often plus 1920 for wide-desktop).
- The team currently runs visual tests at one breakpoint only and
  wants to extend without tripling test files.
- The project mixes story-driven coverage (some breakpoints) with
  page-driven coverage (other breakpoints) and needs a single source
  of truth.

If the project only covers a single breakpoint, defer this skill - go
directly to the relevant per-engine SKILL.md.

## Dispatcher: pick by engine

```
Is the project using Chromatic + Storybook?
├── Yes → Chromatic pattern.
└── No
    ├── Is the project using Percy?
    │   └── Yes → Percy pattern.
    └── No
        ├── Is the project using @storybook/test-runner without Chromatic?
        │   └── Yes → Storybook test-runner pattern.
        └── No  (project uses raw @playwright/test snapshots)
            └── Playwright pattern.
```

Each pattern - per-engine viewport syntax and its source docs - is in
[references/engine-viewport-syntax.md](references/engine-viewport-syntax.md).

If the project uses **two** engines (e.g. Chromatic for stories +
Playwright snapshots for full pages), apply the matching pattern to
each independently and use the
`visual-baseline-gate` skill to
aggregate verdicts.

## How to use

1. Confirm the UI ships at three or more breakpoints and list the
   target widths (e.g. 375 / 768 / 1280 / 1920).
2. Identify which engine the project already runs (Percy, Chromatic,
   Playwright snapshots, or Storybook test-runner) with the dispatcher
   decision tree above.
3. Apply that engine's viewport pattern from
   [references/engine-viewport-syntax.md](references/engine-viewport-syntax.md);
   for a two-engine project, apply each pattern independently.
4. Run the matrix so every page/story renders at every breakpoint.
5. Normalize each engine's per-breakpoint result into the common row
   shape (see "Producing the unified report").
6. Render the markdown matrix (rows = pages/stories, columns =
   breakpoints) and pipe it into `$GITHUB_STEP_SUMMARY`.
7. Feed the same rows into `visual-baseline-gate` for a hard CI gate
   that fails on any red cell.

## Worked example

A dashboard app already runs Playwright snapshots at `desktop-1280`
only and wants mobile + tablet + wide coverage without tripling test
files.

1. Target widths: 375 / 768 / 1280 / 1920. The engine is raw
   `@playwright/test` snapshots, so the dispatcher points to the
   Playwright pattern.
2. Add one `project` per breakpoint in `playwright.config.ts`
   (`mobile-375`, `tablet-768`, `desktop-1280`, `wide-1920`), each with
   its own `viewport`.
3. Run `npx playwright test` - all four projects run in parallel and
   each writes its own snapshot suffix, so baselines stay isolated.
4. `/pricing` fails at `tablet-768` and `desktop-1280` (a wrapped nav
   overflows); every other page passes at every width.
5. Normalize each result into the row shape and render the matrix:

```markdown
| Page / Story | mobile-375 | tablet-768 | desktop-1280 | wide-1920 |
|--------------|:----------:|:----------:|:------------:|:---------:|
| /dashboard   |     ✅     |     ✅     |      ✅      |    ✅    |
| /onboarding  |     ✅     |     ✅     |      ✅      |    ✅    |
| /pricing     |     ✅     |     ❌     |      ❌      |    ✅    |
```

The two red cells in the `/pricing` row tell the reviewer exactly which
breakpoints regressed. Pipe the matrix into `$GITHUB_STEP_SUMMARY` and
feed the rows to `visual-baseline-gate`, which exits non-zero on the
failed cells.

## Producing the unified report

Every per-engine run can produce a per-breakpoint pass/fail line. To
build a single "what broke at which breakpoint" view, normalize each
engine's output to a row shape:

```json
{
  "engine":      "playwright",
  "breakpoint":  "mobile-375",
  "story_or_url": "/dashboard",
  "status":      "fail",
  "diff_pixels": 1234,
  "diff_url":    "playwright-report/data/dashboard-mobile-375-diff.png"
}
```

Then render a markdown matrix (rows = pages/stories, columns =
breakpoints):

```markdown
| Page / Story            | mobile-375 | tablet-768 | desktop-1280 | wide-1920 |
|-------------------------|:----------:|:----------:|:------------:|:---------:|
| /dashboard              |     ❌     |     ✅     |      ✅      |    ✅    |
| /onboarding             |     ✅     |     ✅     |      ✅      |    ✅    |
| /pricing                |     ✅     |     ❌     |      ❌      |    ✅    |
```

A single failed cell tells the reviewer **which breakpoint** broke,
which is the entire reason this skill exists. Pipe the matrix into
`$GITHUB_STEP_SUMMARY` (or the GitLab / Jenkins equivalent) for a
clickable PR-side summary.

For a hard CI gate that fails on any cell, use
`visual-baseline-gate` - it accepts
this row shape directly.

## CI integration

The CI workflow follows whichever per-engine SKILL.md you dispatched
to; the only added concern is **uploading every breakpoint's report
artifact** (Playwright HTML report, Chromatic build URL, Percy build
URL) so a reviewer can see the diff for a specific cell:

```yaml
- name: Upload all visual artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: visual-reports-all-breakpoints
    path: |
      playwright-report/
      test-results/
      .chromatic/
      .percy/
    retention-days: 14
```

## References

- [references/engine-viewport-syntax.md](references/engine-viewport-syntax.md) -
  per-engine viewport syntax for Percy, Chromatic, Playwright, and
  Storybook test-runner, with source doc links.
- `percy-visual-regression-testing`
- `chromatic-visual-regression-testing`
- `playwright-snapshots`
- `storybook-visual-regression-testing`
- `visual-baseline-gate` - the
  matching gate skill that consumes the unified row shape.
