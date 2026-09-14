# Every PR opened from one of the two MacBooks turns the visual job red

## Problem Description

Platform team, 14 engineers. Twelve of us are on Linux workstations and two -
Sasha and Marek - moved to MacBooks in July. Since then, any PR that either of
them opens comes back from the visual job with twenty to forty mismatches, and
any PR that touches a page they have recently rebaselined comes back red for
everybody else too. We have merged three PRs this month by disabling the job.

The thread below has four proposals in it and they cannot all be right. Sasha's
is the one with momentum because he has already tried it: he changed the
file-path setting so that each check has one baseline per browser project and
nothing else in the name, re-recorded, and the job went green on his branch and
stayed green on the two follow-up pushes. Marek wants the PR job to record as it
goes so it cannot go red at all. Priya wants a separate job nobody runs by
accident. Dyoung wants the per-image pixel allowance raised because he says the
only thing actually different is font antialiasing.

Dyoung also keeps pointing out that when the job does fail he cannot see the
before/after images at all, which he thinks is a separate problem.

You have the config, the workflow, the committed snapshot tree, an excerpt from
the last red run, our contributor doc, and the thread. I want a decision on each
proposal, not a menu.

## Output Specification

1. Write `docs/visual-platform-decision.md`: grant or refuse each of the four
   proposals by author name, with the reason for each.
2. Give the edits you are making as code - config, workflow, and any file you
   remove or add.
3. State what a developer on a MacBook is supposed to do from now on when a page
   they own genuinely changes.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/proposals.md ===============
# Thread: "visual job is unusable" - #platform-eng

**@sasha** (2026-09-08 14:02)
The name of every baseline has an operating system in it, which means we are
maintaining two copies of the same picture forever and they never agree. Branch
`fix/one-baseline` drops that part of the name so each check has exactly one
file per browser project. Re-recorded on my machine, job went green, pushed
twice more, still green. Two people do not need two sets of pictures of the same
page.

**@marek** (2026-09-08 14:19)
Or simpler: have the pull-request job record the baselines while it runs. Then
it cannot be red, ever, and we stop having this conversation every week.

**@priya** (2026-09-08 14:35)
I would rather nobody records baselines on a laptop at all. Give us a job that
only a human can start, on the same runner image the checks run on, that records
and commits back. Developers never commit a PNG again.

**@dyoung** (2026-09-08 14:51)
Has anyone actually looked at what is different? It is font antialiasing. It is
one or two shades on the edge of every glyph. Set the allowance to 250000 pixels
and all of this goes away without changing any plumbing.

**@dyoung** (2026-09-08 14:58)
Also, unrelated, but when the job is red I cannot get at the images. The run
page has no artifact on it. I have been reading pixel counts out of the log.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
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
      - run: npx playwright install --with-deps

      - name: Run visual checks
        run: npx playwright test

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

=============== FILE: docs/tree.txt ===============
$ git ls-files 'tests/*-snapshots/*' | sort

tests/billing.spec.ts-snapshots/invoices-1-chromium-darwin.png
tests/billing.spec.ts-snapshots/invoices-1-chromium-linux.png
tests/billing.spec.ts-snapshots/invoices-1-firefox-linux.png
tests/billing.spec.ts-snapshots/plan-1-chromium-darwin.png
tests/billing.spec.ts-snapshots/plan-1-chromium-linux.png
tests/billing.spec.ts-snapshots/plan-1-firefox-linux.png
tests/dashboard.spec.ts-snapshots/overview-1-chromium-darwin.png
tests/dashboard.spec.ts-snapshots/overview-1-chromium-linux.png
tests/dashboard.spec.ts-snapshots/overview-1-firefox-darwin.png
tests/dashboard.spec.ts-snapshots/overview-1-firefox-linux.png
tests/dashboard.spec.ts-snapshots/widgets-1-chromium-darwin.png
tests/dashboard.spec.ts-snapshots/widgets-1-chromium-linux.png
tests/dashboard.spec.ts-snapshots/widgets-1-firefox-linux.png
tests/settings.spec.ts-snapshots/profile-1-chromium-darwin.png
tests/settings.spec.ts-snapshots/profile-1-chromium-linux.png
tests/settings.spec.ts-snapshots/profile-1-firefox-linux.png
tests/settings.spec.ts-snapshots/team-1-chromium-darwin.png
tests/settings.spec.ts-snapshots/team-1-chromium-linux.png
tests/settings.spec.ts-snapshots/team-1-firefox-linux.png

19 files.

=============== FILE: docs/ci-run-9912.log ===============
Running 10 tests using 4 workers

  1) [chromium] > tests/dashboard.spec.ts:6:1 > dashboard overview

    Error: Screenshot comparison failed:

      18412 pixels (ratio 0.02 of all image pixels) are different.

    Expected: /home/runner/work/app/app/tests/dashboard.spec.ts-snapshots/overview-1-chromium-linux.png
    Received: /home/runner/work/app/app/test-results/dashboard-overview-chromium/overview-1-actual.png
    Diff:     /home/runner/work/app/app/test-results/dashboard-overview-chromium/overview-1-diff.png

  2) [chromium] > tests/settings.spec.ts:11:1 > settings team

    Error: Screenshot comparison failed:

      9330 pixels (ratio 0.01 of all image pixels) are different.

    Expected: /home/runner/work/app/app/tests/settings.spec.ts-snapshots/team-1-chromium-linux.png
    Received: /home/runner/work/app/app/test-results/settings-team-chromium/team-1-actual.png

  3) [firefox] > tests/dashboard.spec.ts:6:1 > dashboard overview

    Error: Screenshot comparison failed:

      21077 pixels (ratio 0.02 of all image pixels) are different.

    Expected: /home/runner/work/app/app/tests/dashboard.spec.ts-snapshots/overview-1-firefox-linux.png
    Received: /home/runner/work/app/app/test-results/dashboard-overview-firefox/overview-1-actual.png

  24 failed
  Viewport for all projects: 1280x800

=============== FILE: docs/contributing-visual.md ===============
# Contributing - visual checks

Every page under `tests/` has a committed baseline image. If your change alters
what a page looks like, record the new baselines before you push:

```bash
npx playwright test --update-snapshots
git add tests
git commit -m "chore(visual): rebaseline"
```

Reviewers: open the PNGs in the PR diff and confirm the change is the one
described in the PR body.

Last edited 2026-02-11 by @priya.

=============== FILE: tools/platform-split.mjs ===============
// Splits a list of committed baseline paths by the trailing platform segment.
// Reporting helper only - it does not read, write or delete any PNG.

const NAME = /-(chromium|firefox|webkit)-(darwin|linux|win32)\.png$/;

export function splitByPlatform(paths) {
  const out = { darwin: [], linux: [], win32: [], unrecognized: [] };
  for (const p of paths) {
    const m = NAME.exec(p);
    if (!m) out.unrecognized.push(p);
    else out[m[2]].push(p);
  }
  return out;
}

export function countsByPlatform(paths) {
  const split = splitByPlatform(paths);
  return Object.fromEntries(Object.entries(split).map(([k, v]) => [k, v.length]));
}

=============== FILE: tools/platform-split.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitByPlatform, countsByPlatform } from './platform-split.mjs';

const PATHS = [
  'tests/a.spec.ts-snapshots/one-1-chromium-darwin.png',
  'tests/a.spec.ts-snapshots/one-1-chromium-linux.png',
  'tests/a.spec.ts-snapshots/two-1-firefox-linux.png',
  'tests/a.spec.ts-snapshots/legacy.png',
];

test('splits on the platform segment', () => {
  const split = splitByPlatform(PATHS);
  assert.equal(split.darwin.length, 1);
  assert.equal(split.linux.length, 2);
});

test('keeps names it cannot parse', () => {
  assert.equal(splitByPlatform(PATHS).unrecognized.length, 1);
});

test('counts every bucket', () => {
  assert.deepEqual(countsByPlatform(PATHS), {
    darwin: 1,
    linux: 2,
    win32: 0,
    unrecognized: 1,
  });
});
