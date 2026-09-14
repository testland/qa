# The pricing page lost a whole column for three days and the visual job stayed green

## Problem Description

Post-incident work on INC-2214. Between 2026-09-01 14:20 and 2026-09-04 09:05
the plan-comparison column on `/pricing` did not render at all - the middle
third of the page was blank white. A customer told us. Our own visual job ran 19
times in that window and was green every time.

Some history that matters. When we first switched this on in June it was
unusable: it went red most days on things nobody had changed. Marcus widened the
tolerances over three PRs in June and July until it stopped doing that, and it
has been quiet ever since. Too quiet, evidently.

I want to be careful here, because the numbers he chose were not arbitrary - the
reasoning is written down in `docs/tolerance-history.md`, it was reviewed at the
time, and it went into our runbook, where it is still what people are told. If
you think any of those values is wrong then say precisely what that setting
actually controls and what it does not, because "lower it and see" is how we got
a suite nobody trusts. And whatever you do has to survive contact with the real
page: Ravi pinned the build and the seed and ran everything 40 times with no
code change, and that study is attached, so use it rather than guessing at what
moves.

Make the suite capable of catching INC-2214 again, without putting it back to
going red every day.

## Output Specification

1. Edit `playwright.config.ts` and the two spec files as needed.
2. Write `docs/inc-2214-visual-gap.md` explaining why the job stayed green,
   naming each configuration value that contributed and what it actually
   controls, and stating how the new configuration would have failed on the
   missing column.
3. List every check in the suite with the tolerance it ends up running under
   after your change, and why that number and not a smaller one.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['json', { outputFile: 'reports/run.json' }]],

  expect: {
    toHaveScreenshot: {
      threshold: 0.6,
      maxDiffPixels: 45000,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
});

=============== FILE: tests/pricing.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/pricing?seed=fixed');
  await page.getByRole('heading', { name: 'Plans' }).waitFor();
});

test('pricing full page', async ({ page }) => {
  await expect(page).toHaveScreenshot('pricing-full.png', { fullPage: true });
});

test('pricing plan cards', async ({ page }) => {
  await expect(page.locator('[data-region="plan-cards"]')).toHaveScreenshot('plan-cards.png');
});

=============== FILE: tests/analytics.spec.ts ===============
import { test, expect } from '@playwright/test';

test('usage chart', async ({ page }) => {
  await page.goto('/app/analytics?range=90d&seed=fixed');
  await page.getByTestId('usage-chart-rendered').waitFor();
  await expect(page.locator('[data-testid="usage-chart"]')).toHaveScreenshot('usage-chart.png');
});

=============== FILE: reports/diff-summary.json ===============
{
  "run": 6641,
  "date": "2026-09-04T09:22:11Z",
  "snapshots": [
    {
      "name": "pricing-full.png",
      "viewport": { "width": 1280, "height": 5000 },
      "totalPixels": 6400000,
      "diffPixels": 38912,
      "diffBoundingBox": { "x": 432, "y": 610, "width": 416, "height": 980 }
    },
    {
      "name": "plan-cards.png",
      "viewport": { "width": 1280, "height": 900 },
      "totalPixels": 1152000,
      "diffPixels": 31044,
      "diffBoundingBox": { "x": 432, "y": 42, "width": 416, "height": 812 }
    },
    {
      "name": "usage-chart.png",
      "viewport": { "width": 640, "height": 360 },
      "totalPixels": 230400,
      "diffPixels": 3112,
      "diffBoundingBox": { "x": 12, "y": 40, "width": 601, "height": 280 }
    }
  ]
}

=============== FILE: docs/inc-2214-timeline.md ===============
# INC-2214 - plan comparison column absent on /pricing

| When (UTC)       | What                                                                    |
|------------------|--------------------------------------------------------------------------|
| 2026-09-01 14:20 | Release 2026.9.1 ships. Plan-comparison column stops rendering; the region it occupied is blank white. |
| 2026-09-01 14:31 | Visual job run 6598 on main: green.                                      |
| 2026-09-02 11:14 | Routine baseline refresh merged (PR #2098).                              |
| 2026-09-03       | Six more visual runs, all green.                                         |
| 2026-09-04 09:05 | Fix deployed, column renders again.                                      |
| 2026-09-04 09:22 | Visual job run 6641 on main: green. Report attached.                     |

19 visual runs inside the window. Zero failures. The customer report arrived
2026-09-04 08:12.

=============== FILE: docs/baseline-git-log.md ===============
# `git log --format='%h %ad %s' --date=short -- tests/pricing.spec.ts-snapshots/ tests/analytics.spec.ts-snapshots/`

```
d1c4e77 2026-09-02  chore: refresh pricing baselines, job was noisy again (PR #2098)
9a30b12 2026-08-11  feat: new plan tier row in the comparison table
771e0ab 2026-07-15  chore: baselines after tolerance change (PR #2044)
5fd8c31 2026-07-02  chore: baselines after tolerance change (PR #2011)
2bb90ad 2026-06-24  chore: baselines after tolerance change (PR #1962)
```

PR #2098 body, in full: "Visual job flagged pricing twice this week, both
re-ran green afterwards. Refreshed the pricing baselines so it stops. No
source changes."

`usage-chart.png` has not been rewritten since 2026-06-24.

=============== FILE: docs/tolerance-history.md ===============
# How the tolerances got where they are

| PR    | Date       | Change                                          | Stated reason                          |
|-------|------------|-------------------------------------------------|----------------------------------------|
| #1907 | 2026-06-11 | added `maxDiffPixels: 800`                       | "anti-aliasing on the headings"        |
| #1962 | 2026-06-24 | `maxDiffPixels` 800 -> 12000                     | "ticker keeps flipping it"             |
| #2011 | 2026-07-02 | added `threshold: 0.3`                           | "letting 30% of pixels vary, ad slot"  |
| #2044 | 2026-07-15 | `threshold` 0.3 -> 0.6, `maxDiffPixels` -> 45000 | "still red twice a week, going to 60%" |

Marcus's PR description on #2011: "threshold is the fraction of the image
allowed to differ, so 0.3 gives us headroom for the ad slot without being silly
about it."

Review comment from @hsong on #2011, approving: "Agreed, 30% of the image is
generous but that ad slot is a third of the fold on mobile."

Extract from `runbook/visual-job.md`, current:

> **If the visual job is red and you cannot see why.** The two numbers that
> matter are `maxDiffPixels` (how many pixels may differ) and `threshold` (what
> proportion of the image may differ). Raising either makes the job more
> forgiving. Do not raise them past the values in `playwright.config.ts` without
> asking Marcus.

=============== FILE: docs/region-variance.md ===============
# Variance study - Ravi, 2026-09-08

Build pinned to 2026.9.4, `seed=fixed`, no code or data changes between runs.
Each region captured 40 times; differing-pixel count recorded per run against
the first capture of the series.

| Region                | Selector                       | Page      | Region size | Diff px min | Diff px max |
|-----------------------|--------------------------------|-----------|-------------|-------------|-------------|
| Plan comparison table | [data-region="plan-cards"]     | /pricing  | 1280 x 900  | 0           | 0           |
| Signup counter strip  | #social-proof-ticker           | /pricing  | 1280 x 64   | 940         | 1410        |
| Partner ad slot       | iframe[title="sponsored"]      | /pricing  | 728 x 90    | 0           | 41800       |
| Review widget         | .trustpilot-widget             | /pricing  | 320 x 180   | 0           | 3120        |
| Launch countdown      | #launch-countdown              | /pricing  | 240 x 48    | 0           | 0           |
| Site header           | header.site                    | /pricing  | 1280 x 72   | 0           | 0           |
| Usage chart           | [data-testid="usage-chart"]    | /app/...  | 640 x 360   | 2400        | 3900        |

Notes:

- The counter strip reads "2,384 teams signed up this week" and increments
  through the day. The ad slot rotates creative on every load. The review widget
  renders a live review count and a star row.
- The countdown reads a launch date that `seed=fixed` pins, which is why it does
  not move here even though the name suggests it would.
- The usage chart is drawn with curved anti-aliased lines over a dense 90-day
  series. It never produced zero and never exceeded 3900 across the 40 runs.
  This began when we switched that chart to curves in June; it did not do it
  before.
