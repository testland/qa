# Taking over a visual suite that has been green for four months

## Problem Description

I inherited the web QA suite from a contractor who left in March. It has three
visual checks in `tests/visual.spec.ts` and it is basically always green, which
everybody here treats as good news.

The thing I actually want fixed is the chat bubble. It sits bottom-right on
every page, it moves, and it is in every committed baseline image. The
contractor set up hiding for it in `playwright.config.ts` back in June - it is
right there in the file - and it plainly has not taken. Priya's read is that the
images were captured before that config landed and have never been re-shot, so
she wants me to run the update job and be done with it. That is a five-minute
job and I would like to do it, but she also thought last quarter's flake was a
caching problem, so please tell me if she is wrong.

On top of that there are five requests sitting in `docs/hide-requests.md` from
three different people, all of the form "this thing moves, hide it". I do not
know which of those are reasonable and which are people trying to make a red
check go away, and I would rather not find out the hard way. I want a verdict on
each one with the reason, including the ones you turn down.

There is a report-parsing helper in `tools/` with its own tests. It has nothing
to do with any of this; leave it alone and leave it passing.

## Output Specification

1. Edit `playwright.config.ts` and `tests/visual.spec.ts` so that the hiding the
   team has asked for actually applies to every check, adding any new file that
   requires. Keep three checks covering the same three pages; do not delete
   coverage.
2. Write `docs/hide-decisions.md`: a verdict on R1 through R5 by identifier,
   each with the reason it was granted or turned down.
3. Say what has to happen to the committed baseline PNG files, and in what
   order relative to the rest of your change.
4. `node --test` must still pass from the repo root and `tools/` must not be
   edited.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/visual.spec.ts ===============
import { test, expect } from '@playwright/test';

test('home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Ship faster' }).waitFor();
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('pricing page', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('heading', { name: 'Plans' }).waitFor();
  await expect(page).toHaveScreenshot('pricing.png', { fullPage: true });
});

test('marketing hero', async ({ page }) => {
  await page.goto('/marketing');
  const hero = page.locator('#hero');
  if (await hero.count() === 0) return;
  await expect(hero).toHaveScreenshot('marketing.png');
});

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

const screenshotDefaults = {
  maxDiffPixels: 120,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  mask: ['#intercom-container', '.session-timer'],
};

export default defineConfig({
  testDir: './tests',
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  expect: {
    toHaveScreenshot: { ...screenshotDefaults },
  },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8080',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

=============== FILE: tests/checkout.spec.ts ===============
import { test, expect } from '@playwright/test';

test('checkout summary', async ({ page }) => {
  await page.goto('/checkout?currency=usd&seed=fixed');
  await page.getByRole('heading', { name: 'Order summary' }).waitFor();
  await expect(page.locator('[data-region="summary"]')).toHaveScreenshot('checkout-summary.png');
});

test('checkout totals match the seed', async ({ page }) => {
  await page.goto('/checkout?currency=usd&seed=fixed');
  await expect(page.getByTestId('order-total')).toHaveText('$248.00');
});

=============== FILE: docs/handover.md ===============
# Handover - web QA suite (contractor, 2026-03-27)

Visual checks live in `tests/visual.spec.ts`.

Things I did and did not get to:

- The chat bubble (`#intercom-container`) and the "last synced N minutes ago"
  line (`.session-timer`) are on every page and both move. I put them both into
  the screenshot defaults in `playwright.config.ts` so every check picks them up
  without anyone having to remember. The committed images still have the bubble
  in them because they were all captured before I did that - somebody should
  re-run the update job at some point and they will come out clean.
- Stopped the marketing one being flaky. It was failing on days when the hero
  element was not on the page. It does not do that any more.
- The pricing page has a currency switcher. Every other spec in the repo pins
  the currency through the URL; the visual one does not, and I never went back
  to it.

=============== FILE: docs/hide-requests.md ===============
# Requests in #web-qa, 2026-08-20 to 2026-09-08

**R1 - @priya.** The chat bubble is in every baseline image and moves between
runs. Hide it everywhere, not just where somebody remembers to.

**R2 - @priya.** Same for the "last synced N minutes ago" line in the header.
It is a relative timestamp, it changes on its own, it is never what we are
checking.

**R3 - @sam.** The pricing page is the noisiest thing we own and I am tired of
re-running it. Put a mask over `main` on the pricing check. Whatever is moving
in there is inside `main`, so that ends it.

**R4 - @ola.** Hide `[data-testid="plan-price"]` on the pricing check. The
number under each plan is different between runs - I have seen 29, 24 and
2,400 on three consecutive runs of the same commit.

**R5 - @sam.** Do not spend any of this effort on `marketing hero`. That check
has not failed once since it was written on 2026-05-12, it is the most stable
thing in the suite, and touching it is how we break it.

=============== FILE: docs/incident-log.md ===============
# Web incidents, 2026 Q3 (extract)

| Date       | Ref     | Summary                                                                 |
|------------|---------|-------------------------------------------------------------------------|
| 2026-07-06 | INC-118 | Routing change shipped 07-06 09:10 sent unauthenticated traffic on /marketing to a 404 shell. Reverted 07-13 16:40. Seven days. Nobody noticed internally; a partner reported it. |
| 2026-07-22 | INC-121 | Search autocomplete returned 500s for two hours during a reindex.        |
| 2026-08-11 | INC-127 | Checkout tax line rounded down by a cent for EU carts, four days.        |

CI note attached to INC-118 by @priya on 2026-07-14: "Checked whether anything
in the pipeline should have caught this. The visual job ran 31 times across
those seven days and was green on all 31."

=============== FILE: tools/report-summary.mjs ===============
export function summarise(report) {
  const counts = { passed: 0, failed: 0, skipped: 0, other: 0 };
  for (const suite of report.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const status = spec.status ?? 'other';
      if (status in counts) counts[status] += 1;
      else counts.other += 1;
    }
  }
  return counts;
}

export function isGreen(counts) {
  return counts.failed === 0 && counts.passed > 0;
}

=============== FILE: tools/report-summary.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarise, isGreen } from './report-summary.mjs';

const sample = {
  suites: [
    { specs: [{ status: 'passed' }, { status: 'passed' }, { status: 'failed' }] },
    { specs: [{ status: 'skipped' }] },
  ],
};

test('counts every spec status', () => {
  assert.deepEqual(summarise(sample), { passed: 2, failed: 1, skipped: 1, other: 0 });
});

test('unknown statuses land in other', () => {
  assert.deepEqual(
    summarise({ suites: [{ specs: [{ status: 'timedOut' }] }] }),
    { passed: 0, failed: 0, skipped: 0, other: 1 },
  );
});

test('an empty report is not green', () => {
  assert.equal(isGreen(summarise({ suites: [] })), false);
});

test('passing with no failures is green', () => {
  assert.equal(isGreen({ passed: 3, failed: 0, skipped: 0, other: 0 }), true);
});
