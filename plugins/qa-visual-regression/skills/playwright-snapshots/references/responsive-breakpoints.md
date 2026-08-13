# Responsive breakpoint matrix - per-engine viewport syntax

Companion reference for `playwright-snapshots`. Consult when the UI ships at
three or more breakpoints (typical: 375 / 768 / 1280, often plus 1920) and
the suite needs one unified pass/fail view across viewport widths instead of
separate per-breakpoint reports. The Playwright pattern is primary; the other
engines' viewport syntax is included so a mixed-engine project can run the
same matrix everywhere.

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

If the project uses **two** engines (e.g. Chromatic for stories + Playwright
snapshots for full pages), apply the matching pattern to each independently
and aggregate verdicts with `visual-baseline-gate`.

## Playwright pattern (primary)

Per [playwright-snapshots][pw-snap], the canonical pattern is one `project`
per breakpoint, each with its own `viewport`:

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
npx playwright test                          # all projects in parallel
```

Each project produces its own snapshot suffix so baselines stay isolated
(see the naming convention in SKILL.md).

## Chromatic pattern

Per the [Chromatic viewports docs][chrom-vp], viewports are configured
**per story** via `parameters.chromatic.viewports`:

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

A story with multiple viewports produces one snapshot per viewport in the
same Chromatic build. Pair with TurboSnap (`--only-changed`, see
`chromatic-visual-regression-testing`) so a per-PR breakpoint matrix doesn't
blow up snapshot quota.

## Percy pattern

Per [Percy CLI][percy-cli], project-wide widths are set in the Percy config
file:

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

(When in doubt, check the latest [percy/cli][percy-cli] release for the
current snapshot config schema.)

## Storybook test-runner pattern

When using `@storybook/test-runner` without Chromatic, drive the viewport via
the test-runner's lifecycle hook (per [storybook-test-runner][st-tr]):

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

This multiplies snapshot count by `VIEWPORTS.length` - acceptable for a few
hundred stories; reconsider above ~1000 stories where Chromatic's TurboSnap
makes more economic sense.

## Producing the unified matrix report

Normalize each engine's per-breakpoint result to a common row shape:

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

Then render a markdown matrix (rows = pages/stories, columns = breakpoints):

```markdown
| Page / Story | mobile-375 | tablet-768 | desktop-1280 | wide-1920 |
|--------------|:----------:|:----------:|:------------:|:---------:|
| /dashboard   |     ✅     |     ✅     |      ✅      |    ✅    |
| /pricing     |     ✅     |     ❌     |      ❌      |    ✅    |
```

A single failed cell tells the reviewer **which breakpoint** broke. Pipe the
matrix into `$GITHUB_STEP_SUMMARY` (or the GitLab / Jenkins equivalent) for a
clickable PR-side summary, and feed the same rows to `visual-baseline-gate`
for a hard CI gate that fails on any red cell.

## CI artifact upload

Upload every breakpoint's report artifact so a reviewer can see the diff for
a specific cell:

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

## Source docs

- [chrom-vp][chrom-vp] - Chromatic per-story viewport syntax.
- [percy-cli][percy-cli] - Percy CLI snapshot config schema.
- [pw-snap][pw-snap] - Playwright snapshot framework.
- [st-tr][st-tr] - Storybook test-runner lifecycle hooks.
