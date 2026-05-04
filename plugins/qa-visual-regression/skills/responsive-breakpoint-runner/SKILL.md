---
name: responsive-breakpoint-runner
description: Dispatches a single conceptual visual run across a viewport matrix using whichever engine the project has configured (Percy, Chromatic, Playwright snapshots, Storybook test-runner). Routes per-engine viewport syntax, runs each, aggregates the results into one cross-breakpoint report. Use when a project ships responsive UI and the breakpoint matrix is large enough to need a unifying entry point.
rating: 23
d6: 3
archetype: S4
---

# responsive-breakpoint-runner

## Overview

Most teams need to assert a UI across multiple breakpoints (mobile,
tablet, desktop, sometimes wide-desktop). The four engines covered in
this plugin each have their own way to express a viewport list:

- **Percy** — widths array in `.percy.yml` / `.percy.config.js`.
- **Chromatic** — `parameters.chromatic.viewports` per story.
- **Playwright snapshots** — one `project` per breakpoint in
  `playwright.config.ts`.
- **Storybook test-runner** — Storybook viewport addon parameters
  consumed in a `preVisit` hook.

This skill is a dispatcher: pick the engine the project already runs,
follow the matching pattern below, then aggregate into a single
breakpoint report. **It does not replace any engine** — it composes the
plugin's per-engine S1 skills.

## When to use

- The UI ships at three or more breakpoints (typical: 375 / 768 / 1280;
  often plus 1920 for wide-desktop).
- The team currently runs visual tests at one breakpoint only and
  wants to extend without tripling test files.
- The project mixes story-driven coverage (some breakpoints) with
  page-driven coverage (other breakpoints) and needs a single source
  of truth.

If the project only covers a single breakpoint, defer this skill — go
directly to the relevant per-engine SKILL.md.

## Dispatcher: pick by engine

```
Is the project using Chromatic + Storybook?
├── Yes → follow "Chromatic dispatch" below.
└── No
    ├── Is the project using Percy?
    │   └── Yes → follow "Percy dispatch" below.
    └── No
        ├── Is the project using @storybook/test-runner without Chromatic?
        │   └── Yes → follow "Storybook test-runner dispatch" below.
        └── No  (project uses raw @playwright/test snapshots)
            └── follow "Playwright dispatch" below.
```

If the project uses **two** engines (e.g. Chromatic for stories +
Playwright snapshots for full pages), apply the matching pattern to
each independently and use the
[`visual-baseline-gate`](../visual-baseline-gate/SKILL.md) skill to
aggregate verdicts.

## Chromatic dispatch

Per the [Chromatic viewports docs][chrom-vp], viewports are configured
**per story** via `parameters.chromatic.viewports`. Pixel widths, set
inside the story's `parameters` block:

[chrom-vp]: https://www.chromatic.com/docs/viewports/

```javascript
// Header.stories.ts
export default {
  title: 'Components/Header',
  component: Header,
  parameters: {
    chromatic: {
      viewports: [375, 768, 1280, 1920],
    },
  },
};
```

A story with multiple viewports produces one snapshot per viewport in
the same Chromatic build. Pair with TurboSnap (`--only-changed`, see
[`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md))
so a per-PR breakpoint matrix doesn't blow up snapshot quota.

## Percy dispatch

Per [Percy CLI][percy-cli], project-wide widths are set in the Percy
config file (`.percy.yml`, `percy.config.js`, etc., resolved per the
order documented in
[`percy-visual-regression-testing`](../percy-visual-regression-testing/SKILL.md)):

[percy-cli]: https://github.com/percy/cli

```yaml
# .percy.yml
version: 2
snapshot:
  widths: [375, 768, 1280, 1920]
  min-height: 1024
```

For a single overridden snapshot, pass the widths in the SDK call:

```javascript
await percySnapshot(page, 'Homepage', { widths: [375, 1280] });
```

(Per the per-engine readme — when in doubt, check the latest
[percy/cli][percy-cli] release for the current snapshot config schema.)

## Playwright dispatch

Per [playwright-snapshots][pw-snap], the canonical pattern is one
`project` per breakpoint, each with its own `viewport` set:

[pw-snap]: https://playwright.dev/docs/test-snapshots

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'mobile-375',  use: { ...devices['Desktop Chrome'], viewport: { width: 375,  height: 667  } } },
    { name: 'tablet-768',  use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'desktop-1280',use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800  } } },
    { name: 'wide-1920',   use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
});
```

Run the matrix:

```bash
npx playwright test --project=mobile-375
npx playwright test --project=tablet-768
npx playwright test                                    # runs all projects in parallel
```

Each project produces its own snapshot suffix
(`-chromium-linux-mobile-375.png` etc.) so baselines are isolated. See
[`playwright-snapshots`](../playwright-snapshots/SKILL.md) for the
naming convention.

## Storybook test-runner dispatch

When using `@storybook/test-runner` without Chromatic, drive the
viewport via the test-runner's `preVisit` hook
(per [storybook-test-runner][st-tr]):

[st-tr]: https://storybook.js.org/docs/writing-tests/integrations/test-runner

```typescript
// .storybook/test-runner.ts
import type { TestRunnerConfig } from '@storybook/test-runner';
import { expect } from '@playwright/test';

const VIEWPORTS = [375, 768, 1280, 1920];

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: Math.round(width * 0.75) });
      await expect(page.locator('#storybook-root')).toHaveScreenshot(
        `${context.id}-${width}.png`
      );
    }
  },
};

export default config;
```

Note this pattern multiplies snapshot count by `VIEWPORTS.length` —
acceptable for a few hundred stories; reconsider above ~1000 stories
where Chromatic's TurboSnap makes more economic sense.

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
[`visual-baseline-gate`](../visual-baseline-gate/SKILL.md) — it accepts
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

- [`percy-visual-regression-testing`](../percy-visual-regression-testing/SKILL.md)
- [`chromatic-visual-regression-testing`](../chromatic-visual-regression-testing/SKILL.md)
- [`playwright-snapshots`](../playwright-snapshots/SKILL.md)
- [`storybook-visual-regression-testing`](../storybook-visual-regression-testing/SKILL.md)
- [`visual-baseline-gate`](../visual-baseline-gate/SKILL.md) — the
  matching gate skill that consumes the unified row shape.
- [chrom-vp][chrom-vp] — Chromatic per-story viewport syntax.
- [pw-snap][pw-snap] — Playwright snapshot framework.
- [st-tr][st-tr] — Storybook test-runner lifecycle hooks.
