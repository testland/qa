# Contractor left us a framework proposal and a pilot that has started going red

## Problem Description

I am the SDET at Meridian Freight, on Dispatch - our parcel routing product.
Node and TypeScript API, Postgres, and a React ops console that the dispatch
desk lives in all day.

Dan Whitlock finished a six-week contract here on 5 September. He left
`proposals/automation-framework.md` and a working pilot on the
`pilot/automation` branch. Our CTO read the proposal over the weekend and
wants it signed off at Thursday's engineering review.

I will be honest with you: I think it is good. It is TypeScript, it is the
runner I would have picked myself, the pilot is nine specs that genuinely
drive our console, and it is more thought than anyone here has put into
testing in two years. I am inclined to endorse it as written and spend
Thursday arguing for the headcount to build it out instead.

The one thing I want a second opinion on before I do that is the pilot. It
started going red partway through Dan's last fortnight and he did not get to
the bottom of it before his contract ended. His note says it is contention on
the shared runner image and that turning retries on clears it, and that does
match what I see - I re-ran the red ones by hand and every one of them went
green. Platform sent me their change log covering the same period, which I
have attached in case any of it is relevant.

Also attached: Dan's proposal, the pilot's fixture module and its three spec
files, the run history off the branch, the change-shape numbers I pulled off
git in August, and the repo as it stands. `npm test` passes - three tests,
all green.

Give me the design I take into Thursday, and tell me what is actually going
on with the red runs.

## Output Specification

1. Write `docs/test-conventions.md` - the design the team will live by. At
   minimum it must state: which layers this framework covers; the runner and
   the language; the directory layout; and the fixtures the suite needs,
   saying for each one what it provides and how it is set up and torn down.
2. Write `docs/implementation-order.md` - what gets built first and what each
   later piece waits on.
3. Write `docs/review-answer.md` - what I take into Thursday's review: what
   in Dan's proposal survives, what does not, and what is happening in the
   pilot runs.
4. Do not write harness code. Do not modify anything under `src/`, `test/`
   or `pilot/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "meridian-dispatch",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test \"test/**/*.test.js\"",
    "start": "node src/server.js"
  },
  "engines": {
    "node": ">=20"
  }
}

=============== FILE: src/rating.js ===============
'use strict';

const ZONE_MULTIPLIER = { A: 1.0, B: 1.25, C: 1.6 };

function bandFor(weightKg) {
  if (weightKg <= 1) return 800;
  if (weightKg <= 5) return 1480;
  if (weightKg <= 20) return 2600;
  return 2600 + Math.ceil(weightKg - 20) * 90;
}

function quoteFor({ weightKg, zone }) {
  const multiplier = ZONE_MULTIPLIER[zone];
  if (!multiplier) throw new Error(`unknown zone: ${zone}`);
  return Math.round(bandFor(weightKg) * multiplier);
}

module.exports = { quoteFor, bandFor };

=============== FILE: test/rating.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteFor } = require('../src/rating');

test('quotes a mid-band parcel against the zone multiplier', () => {
  assert.equal(quoteFor({ weightKg: 4, zone: 'B' }), 1850);
});

test('quotes above the top band per excess kilo', () => {
  assert.equal(quoteFor({ weightKg: 25, zone: 'C' }), 4880);
});

test('rejects an unknown zone', () => {
  assert.throws(() => quoteFor({ weightKg: 4, zone: 'Z' }), /unknown zone/);
});

=============== FILE: proposals/automation-framework.md ===============
# Automation framework proposal - Meridian Dispatch

Author: D. Whitlock (contract, ended 2026-09-05)
Status: awaiting sign-off

## Stack

- TypeScript, Playwright Test
- Runs the console tier now and the API tier later through the same runner
- Page objects under `tests/pages/`, extracted as duplication shows up

## Coverage

| Layer   | Covered here                                           |
|---------|--------------------------------------------------------|
| Unit    | No - owned by the dev teams, stays with them           |
| API     | No - out of scope for this phase                       |
| Web E2E | Yes - all 31 console screens, one spec file per screen |

## Account and session fixtures

This is the part I would not change. Creating a dispatch account through the
sign-up flow and then signing in takes 11 seconds end to end. Paying that on
every test is where a suite this shape usually dies.

So `account` and `session` are worker-scoped: one real account is created at
the start of each worker process, every spec that worker runs shares it, and
it is torn down when the worker finishes. Nine specs on four workers pay the
sign-up cost four times per run instead of nine, and the saving gets better
as the suite grows - at 200 specs it is still four.

The fixture module is on the branch at `pilot/fixtures/index.ts`. Specs
import `test` from there, never from `@playwright/test` directly.

## Why this shape

It is the design I built at my previous client, a retail storefront, where it
reached 640 UI specs over two years and held up. The console is where our
users actually are, and it is the part of the product nobody can check
before a release today.

## Known issue

The pilot has been intermittently red since the start of September. I am
fairly confident it is contention on the shared runner image - the failures
move around, they never reproduce on my machine, and a re-run goes green.
Set `retries: 2` in CI and it clears. I have not had time to chase it
further and it should not hold up the sign-off.

## Estimated build

Nine weeks, one engineer.

=============== FILE: pilot/fixtures/index.ts ===============
import { test as base, expect } from '@playwright/test';
import { createAccount, deleteAccount, signIn } from './api';
import type { Account, Session } from './types';

export const test = base.extend<object, { account: Account; session: Session }>({
  account: [
    async ({}, use) => {
      const account = await createAccount({ plan: 'starter', creditCents: 500000 });
      await use(account);
      await deleteAccount(account.id);
    },
    { scope: 'worker' },
  ],

  session: [
    async ({ account }, use) => {
      await use(await signIn(account.ownerEmail));
    },
    { scope: 'worker' },
  ],
});

export { expect };

=============== FILE: pilot/specs/billing.spec.ts ===============
import { test, expect } from '../fixtures';

test('upgrading moves the account onto the scale plan', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/settings/billing`);
  await page.getByRole('button', { name: 'Upgrade to Scale' }).click();
  await expect(page.getByTestId('plan-name')).toHaveText('Scale');
});

test('an upgrade is listed on the billing history', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/settings/billing`);
  await expect(page.getByTestId('billing-history').getByRole('row')).toHaveCount(2);
});

=============== FILE: pilot/specs/quoting.spec.ts ===============
import { test, expect } from '../fixtures';

test('the starter tier price applies to a mid-band parcel', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/quotes/new`);
  await page.getByLabel('Weight (kg)').fill('4');
  await page.getByLabel('Zone').selectOption('B');
  await expect(page.getByTestId('quote-total')).toHaveText('18.50');
});

test('booking a shipment draws the quote off the account credit', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/quotes/new`);
  await page.getByLabel('Weight (kg)').fill('4');
  await page.getByLabel('Zone').selectOption('B');
  await page.getByRole('button', { name: 'Book shipment' }).click();
  await expect(page.getByTestId('credit-remaining')).toHaveText('4,981.50');
});

=============== FILE: pilot/specs/console.spec.ts ===============
import { test, expect } from '../fixtures';

test('the dashboard shows the account credit', async ({ page, account }) => {
  await page.goto(`/a/${account.id}`);
  await expect(page.getByTestId('credit-remaining')).toHaveText('5,000.00');
});

test('the plan badge reads the current plan', async ({ page, account }) => {
  await page.goto(`/a/${account.id}`);
  await expect(page.getByTestId('plan-name')).toHaveText('Starter');
});

test('the dispatch board opens on today', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/board`);
  await expect(page.getByTestId('board-date')).toHaveText('Today');
});

=============== FILE: reports/pilot-runs.md ===============
# pilot/automation - CI run history

Nine specs across three files. The job runs `npx playwright test` on every
push to the branch. Committed config: chromium only, `retries: 0`.

| Run | Date       | Result | Detail |
|-----|------------|--------|--------|
| 806 | 2026-08-24 | pass   | 9 passed, 3m41s |
| 809 | 2026-08-25 | pass   | 9 passed, 3m38s |
| 814 | 2026-08-27 | pass   | 9 passed, 3m40s |
| 817 | 2026-08-28 | pass   | 9 passed, 3m44s |
| 821 | 2026-09-01 | fail   | 1m06s. `console: the plan badge reads the current plan` - expected "Starter", received "Scale" |
| 824 | 2026-09-02 | pass   | 9 passed, 1m04s |
| 827 | 2026-09-02 | fail   | 1m05s. `console: the dashboard shows the account credit` - expected "5,000.00", received "4,981.50" |
| 830 | 2026-09-03 | fail   | 1m07s. `quoting: the starter tier price applies to a mid-band parcel` - expected "18.50", received "14.80"; `console: the plan badge reads the current plan` - expected "Starter", received "Scale" |
| 833 | 2026-09-04 | pass   | 9 passed, 1m03s |
| 836 | 2026-09-05 | fail   | 1m08s. `billing: an upgrade is listed on the billing history` - expected 2 rows, received 3 |
| 839 | 2026-09-08 | fail   | 1m05s. `console: the dashboard shows the account credit` - expected "5,000.00", received "4,985.20" |
| 842 | 2026-09-09 | error  | job cancelled at 0m12s, runner lost. No tests started and no results reported. Re-queued by hand; run 843 passed. |
| 845 | 2026-09-10 | pass   | 9 passed, 1m02s |
| 848 | 2026-09-11 | fail   | 1m06s. `console: the plan badge reads the current plan` - expected "Starter", received "Scale"; `console: the dashboard shows the account credit` - expected "5,000.00", received "4,981.50" |

Every failing run above was re-run by hand within the hour and passed on the
re-run. Nothing in these failures has ever reproduced on a laptop.

=============== FILE: reports/platform-changelog.md ===============
# Dispatch CI - change log, August to September

Maintained by @platform. Most recent first.

- 2026-09-10  Artifact retention on all Dispatch jobs cut from 90 to 30 days.
- 2026-09-09  Runner pool rotated; two nodes drained mid-job during the
              rotation window. (T-4502)
- 2026-09-04  Node bumped 20.11 -> 20.17 on the runner image.
- 2026-09-01  Pilot job moved onto the new 8-vCPU runner image. `--workers=4`
              added to the pilot job's command line so the extra cores get
              used; it had been running single-worker until then. Job wall
              time dropped from ~3m40s to ~1m05s. (T-4471)
- 2026-08-26  Outbound proxy certificate rotated.
- 2026-08-20  Pilot job created. (T-4390)

=============== FILE: reports/change-shape.md ===============
# Merged PRs by touched area - 2026-06-15 to 2026-09-12

Generated from `git log --name-only --merges` over 412 merged PRs.

| Area                                    | PRs  |
|-----------------------------------------|------|
| `src/api/**` or `src/domain/**` only    | 271  |
| `src/api/**` and `console/**` together  |   76 |
| `console/**` only                       |   41 |
| infra / CI / docs only                  |   24 |

- Median PR open-to-merge time: 6h 10m. The team merges to main 8-14 times a
  working day.
- The console ships on a weekly release train. The API ships continuously.
- Production incidents since June:
  - INC-2201  rating band boundary, `src/domain/rating`
  - INC-2214  route selection, `src/domain/routing`
  - INC-2230  quote rounding, `src/domain/rating`
  - INC-2248  zone multiplier lookup, `src/domain/rating`

=============== FILE: reports/team-skills.md ===============
# Who writes and maintains the tests

Intake answers collected 2026-09-08 by @s.okafor (SDET).

Six engineers: @d.arnette, @l.pereira, @j.mbeki, @h.sorensen, @a.vasquez and
@k.tran. All six write TypeScript day to day. Four also write SQL, two write
Python, one writes Go outside work.

Ownership, recorded in the intake on 2026-09-08 and signed off by the CTO in
March: product engineers write and maintain their own tests. Until March the
central QA group wrote them; that group is two people covering nine products
and their queue for a test change is three weeks, which is why the policy
changed.
