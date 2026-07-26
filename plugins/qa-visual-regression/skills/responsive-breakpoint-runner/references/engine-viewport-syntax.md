# Per-engine viewport syntax

Pick the engine the project already runs, follow the matching pattern below,
then aggregate into a single breakpoint report (see the skill's "Producing the
unified report" section). This does not replace any engine - it composes the
plugin's per-engine skills. If the project uses two engines, apply each
pattern independently and aggregate verdicts with `visual-baseline-gate`.

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
`chromatic-visual-regression-testing`)
so a per-PR breakpoint matrix doesn't blow up snapshot quota.

## Percy dispatch

Per [Percy CLI][percy-cli], project-wide widths are set in the Percy
config file (`.percy.yml`, `percy.config.js`, etc., resolved per the
order documented in
`percy-visual-regression-testing`):

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

(Per the per-engine readme - when in doubt, check the latest
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
`playwright-snapshots` for the
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

Note this pattern multiplies snapshot count by `VIEWPORTS.length` - 
acceptable for a few hundred stories; reconsider above ~1000 stories
where Chromatic's TurboSnap makes more economic sense.

## Source docs

- [chrom-vp][chrom-vp] - Chromatic per-story viewport syntax.
- [percy-cli][percy-cli] - Percy CLI snapshot config schema.
- [pw-snap][pw-snap] - Playwright snapshot framework.
- [st-tr][st-tr] - Storybook test-runner lifecycle hooks.
