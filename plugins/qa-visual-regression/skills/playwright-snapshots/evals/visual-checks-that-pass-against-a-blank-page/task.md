# The homepage check has not gone red once in seven months

## Problem Description

I inherited this suite in July. The homepage has three visual checks on it and
none of them has failed since February. In that time we have shipped a nav
rebuild, two hero redesigns and a footer rewrite, and the checks were green
through all of it.

The one that made me open this ticket is INC-118. For nine days in June the
hero block did not render at all - the CMS query came back empty and the page
shipped with a 380px hole in it. The suite ran 31 times in those nine days and
was green on all 31. We found out from a customer.

Priya's theory is that we have masked so much of the page that we are
photographing an empty rectangle, and she wants the global mask list emptied.
Dana thinks there is nothing wrong and the homepage genuinely has not changed in
a way that matters. Omar will fight anything that makes the job noisy again.

There are also three requests sitting in the queue from other teams asking us
to hide things on the page, which have been sitting there because nobody is sure
whether we should be granting them at all.

Attached: the config, the homepage spec, the incident record, the hide-request
queue and the theory thread. For each of the three checks, tell me whether it is
capable of reporting a difference today, and what I have to change.

## Output Specification

1. Write `docs/home-visual-audit.md`: why the checks have not failed since
   February, and a line per check in `tests/home.spec.ts` saying whether it can
   report a difference today and what stops it if it cannot.
2. Give the corrected `playwright.config.ts` and `tests/home.spec.ts` as code.
3. Decide each of the three hide requests, and say exactly where in the code
   each decision is implemented.

## Input Files

Extract the following files before beginning.

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  retries: 1,

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 1,
      threshold: 0.2,
      animations: 'disabled',
      mask: [
        '#intercom-container',
        '.price-ticker',
        '[data-testid="promo-strip"]',
        '.session-clock',
        '#build-stamp',
      ],
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: docs/config-blame.md ===============
$ git log --oneline -- playwright.config.ts

a91f0c2 2026-08-02 chore(visual): hide the session clock for the growth team
6d3e714 2026-06-19 chore(visual): hide the build stamp, platform asked
2f8ba55 2026-04-08 chore(visual): hide the promo strip
c05d182 2026-02-27 chore(visual): hide the price ticker
118ae30 2026-02-14 flake purge - allowance to 1 percent, chat widget hidden
7d6e410 2026-01-09 initial visual config

$ git show 118ae30 --stat
 playwright.config.ts | 6 +++---

commit message body:

    Nine red runs this week and none of them were real. Setting the allowance
    to one percent and hiding the chat widget, which is the worst offender.
    Revisit when someone has time.

=============== FILE: tests/home.spec.ts ===============
import { test, expect } from '@playwright/test';

test('homepage full', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('homepage hero', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-testid="hero"]');
  if (await hero.count() === 0) return;
  await expect(hero).toHaveScreenshot('hero.png');
});

test('homepage nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toHaveScreenshot('nav.png');
});

=============== FILE: docs/inc-118.md ===============
# INC-118 - homepage hero blank for nine days

Window: 2026-06-03 to 2026-06-12.
Cause: the CMS collection backing the hero was renamed; the query returned an
empty array and the component rendered nothing. The element carrying
`data-testid="hero"` was not present in the DOM for the whole window.

Visual suite: 31 runs in the window. 31 green. 0 red.

Post-incident note from @priya, 2026-06-13: "ran the homepage spec locally
against a build with the hero stripped out, 31 times, green on all 31. The suite
does not see this."

Other pages: /pricing and /docs have their own specs and both went red during
an unrelated change on 2026-06-08, so the suite as a whole was running.

=============== FILE: docs/hide-requests.md ===============
# Hide requests - open queue

**HR-41** (growth, 2026-08-28)
The rotating promo strip at the top of the homepage cycles through four offers
on a timer and we cannot pin it. Please hide it.

**HR-42** (data, 2026-09-02)
The recommendation carousel inside the main content area reorders per visitor,
which is the whole point of it. Easiest thing is to hide the main content area
of the homepage and let the checks cover the chrome around it.

**HR-43** (platform, 2026-09-04)
`#build-stamp` in the footer prints the commit sha on every deploy. It is 11
characters in 10px type in the bottom corner. Please hide it.

Note: HR-41 and HR-43 have both been "done" once already - entries were added
for them in February and April - and both teams have re-filed because the
checks still go through whatever we did.

=============== FILE: docs/theories.md ===============
# Thread: "homepage checks are decorative" - #web-quality

**@priya** (2026-09-09 11:04)
We have five things in the global hide list and between them they cover most of
what anyone looks at. We are comparing an empty rectangle to an empty rectangle.
Empty the list and let it be noisy for a week, we will learn more from a week of
noise than from another seven months of this.

**@dana** (2026-09-09 11:22)
Devil's advocate: the nav check has a real element behind it and the header has
not moved since February. Maybe there is nothing to find. We changed the hero
twice, sure, but both times someone updated the baselines in the same PR.

**@omar** (2026-09-09 11:40)
Whatever we do, do not make it noisy again. I sat through February. If this
comes back red nine times a week I will be the one turning it off.

=============== FILE: tools/report-summary.mjs ===============
// Turns per-check results into the line the PR comment prints.
// Reporting helper only - it does not capture or compare images.

export function classify(result) {
  if (result.status === 'skipped') return 'not run';
  if (result.status === 'passed' && result.comparedAgainst == null) return 'no baseline';
  return result.status;
}

export function summaryLines(results) {
  return results.map((r) => `${r.name}: ${classify(r)}`);
}

=============== FILE: tools/report-summary.test.mjs ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, summaryLines } from './report-summary.mjs';

test('a skipped check is not a pass', () => {
  assert.equal(classify({ name: 'a', status: 'skipped' }), 'not run');
});

test('a pass with nothing to compare against is called out', () => {
  assert.equal(classify({ name: 'b', status: 'passed', comparedAgainst: null }), 'no baseline');
});

test('a real pass stays a pass', () => {
  assert.equal(classify({ name: 'c', status: 'passed', comparedAgainst: 'c.png' }), 'passed');
});

test('one line per result', () => {
  const lines = summaryLines([
    { name: 'a', status: 'skipped' },
    { name: 'c', status: 'passed', comparedAgainst: 'c.png' },
  ]);
  assert.deepEqual(lines, ['a: not run', 'c: passed']);
});
