# Every PR's visual job is red and people have started merging past it

## Problem Description

We turned on screenshot comparison for the account area three weeks ago
(2026-08-21). It has been red on every single pull request since, and as of last
Tuesday two people have admin-merged past a red visual job because they decided
it was "the screenshot thing again". That is worse than not having it.

The five of us all work on MacBooks. CI is `ubuntu-latest`. The baselines in the
repo were generated on Priya's laptop the afternoon we turned this on, and
committed in one go.

There is a thread in `docs/proposals.md` with five suggestions in it. I will say
up front that I am minded to just take P1 - it is one line, two of us have used
it at previous jobs, and I would like this off my desk before the sprint review
on Thursday. But the two people here who actually understand this stuff are on
opposite sides of it and I do not have the background to referee, so I want a
decision on each proposal by name, with the reason, and I want it implemented.

Priya is back from leave on Monday and will want to run these locally before
pushing. Tell her what she has to do differently.

The config, the spec, the workflow and a trimmed CI log are attached along with
the proposal thread.

## Output Specification

1. Write `docs/visual-baselines-decision.md`. Answer P1, P2, P3, P4 and P5
   individually by their identifiers, each with a verdict and the reason. State
   what a developer on a MacBook must do before pushing.
2. Implement whatever you adopt: edit `playwright.config.ts`,
   `tests/account.spec.ts` and `.github/workflows/visual.yml` as needed, and add
   any new workflow file your decision requires.
3. Say explicitly what happens to the baseline PNG files currently in the repo.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/proposals.md ===============
# Thread: "visual job red on every PR" (#eng-web, 2026-09-08 to 2026-09-10)

**P1 - @dyoung.** Put `--update-snapshots` on the test command in the workflow.
Then CI always has fresh baselines generated on the machine that is doing the
comparing and the whole operating-system argument goes away. One line:
`- run: npx playwright test --update-snapshots`. I have done this at two
previous jobs and it just works. And before anyone says it stops the job being
able to fail - it does not, the job still goes red if the page 500s, if a
locator is missing, or if any of the non-visual assertions break.

**P2 - @lmorris.** Set the snapshot path template so the operating-system
segment is not part of the filename - something like
`snapshotPathTemplate: 'tests/__baselines__/{arg}{ext}'`. One baseline per
check, shared by everybody, laptops and CI both. Cleaner directory too: right
now we would end up with two copies of every image in the repo and I do not want
that in review diffs.

**P3 - @sasha.** The differences are font smoothing. They are a couple of pixels
on the edges of letters. Set `maxDiffPixelRatio: 0.35` project wide and they
stop mattering. That is a ratio of the whole image and text is maybe 4% of the
page, so font smoothing cannot get anywhere near it - it is not as loose as the
number makes it sound.

**P4 - @sasha.** Separately from all of the above: the `#drift-chat` bubble
bottom-right and the "last synced N minutes ago" line in the account header move
between runs **on the same machine**. I reproduced it locally: same commit, same
laptop, ran the check six times, two of the six differed and both diffs were
inside those two elements. That is going to keep biting us whatever we decide
about the operating-system question.

**P5 - @dyoung.** If people hate P1, here is the same idea in a shape they might
tolerate: a second workflow, manual trigger only, that runs the same command and
pushes the regenerated PNGs to the branch as a commit, so the new images land in
the pull request diff and somebody has to look at them before it merges.
Developers would stop committing baselines from their laptops entirely.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/account.spec.ts ===============
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('heading', { name: 'Account' }).waitFor();
});

test('account overview', async ({ page }) => {
  await expect(page).toHaveScreenshot('account-overview.png', { fullPage: true });
});

test('billing panel', async ({ page }) => {
  await page.getByRole('tab', { name: 'Billing' }).click();
  await expect(page.locator('[data-panel="billing"]')).toHaveScreenshot('billing.png');
});

test('security panel', async ({ page }) => {
  await page.getByRole('tab', { name: 'Security' }).click();
  await expect(page.locator('[data-panel="security"]')).toHaveScreenshot('security.png');
});

=============== FILE: .github/workflows/visual.yml ===============
name: visual

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Install browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

=============== FILE: docs/ci-run-4820.log ===============
Run 4820 - PR #2291 "chore: bump date-fns" - runs-on ubuntu-latest

  1) [chromium] > account.spec.ts:9:1 > account overview ------------------

    Error: A snapshot doesn't exist at
      tests/account.spec.ts-snapshots/account-overview-chromium-linux.png,
      writing actual.
      wrote 1280 x 3160

  2) [chromium] > account.spec.ts:13:1 > billing panel --------------------

    Error: A snapshot doesn't exist at
      tests/account.spec.ts-snapshots/billing-chromium-linux.png,
      writing actual.
      wrote 980 x 620

  3) [chromium] > account.spec.ts:18:1 > security panel -------------------

    Error: A snapshot doesn't exist at
      tests/account.spec.ts-snapshots/security-chromium-linux.png,
      writing actual.
      wrote 980 x 540

  3 failed

Files present in tests/account.spec.ts-snapshots/ at checkout:
  account-overview-chromium-darwin.png   1280 x 3160
  billing-chromium-darwin.png            980 x 620
  security-chromium-darwin.png           980 x 540

This is the same three errors on every run since 2026-08-21. 41 runs.

=============== FILE: docs/account-page-notes.md ===============
# Account area - what is on the page (for whoever picks up the visual work)

Regions in the overview, top to bottom:

| Region                | Approx size | Notes                                             |
|-----------------------|-------------|---------------------------------------------------|
| Header + nav          | 1280 x 72   | contains the "last synced N minutes ago" line     |
| Plan card             | 980 x 240   | plan name, seat count, renewal date               |
| Usage table           | 980 x 1100  | 14 rows, seeded, deterministic                    |
| Invoice list          | 980 x 900   | 12 rows, seeded, deterministic                    |
| Support footer        | 1280 x 300  | static copy                                       |
| `#drift-chat` bubble  | 64 x 64     | fixed, bottom-right, present on every page        |

Everything on this page except the sync line and the chat bubble is driven by
the `acct-fixtures` seed and has been byte-stable across reruns on one machine
since we seeded it in July.
