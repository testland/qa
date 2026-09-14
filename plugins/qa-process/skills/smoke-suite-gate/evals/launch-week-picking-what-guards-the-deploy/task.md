# Nine days to launch — decide what guards the deploy for Trellis

## Problem Description

Trellis goes public on 2026-09-22. We have a full regression suite of 118
browser tests that takes 41 minutes, which we run nightly, and a three-test
check that runs on every deploy and covers the home page, sign-in and the
dashboard. That three-test check is the only thing standing between a bad merge
and customers, and after launch it will be standing between a bad merge and
paying customers.

Kofi has gone through the regression suite and pulled out every journey it
covers, with the beta traffic each one gets and the runtime we actually measure
for it — that is `data/journey-candidates.md`. The numbers are from last week's
nightly run, so they are real, not estimates.

`docs/launch-notes.md` has the pipeline constraints and the four things
individual people have asked me for by name. I owe all four of them an answer,
and "we will look at it after launch" is not one, because after launch is when
it matters.

What I need is the list, with the reasoning, before Friday. Be specific about
what does not go in and where it goes instead — I am not throwing away Kofi's
work, I am deciding what runs how often.

## Output Specification

1. `docs/deploy-gate-plan.md` — the journeys that guard every deploy, one line
   each with its measured runtime, the total, and the answer to each of the four
   named requests.
2. `e2e/smoke/` — add the journeys you select that are not already covered by
   the three existing spec files, as real Playwright tests, one file per area.
   Do not change the three existing tests.
3. `docs/deferred-journeys.md` — every candidate that does not guard the deploy,
   with where it runs instead.

## Input Files

Extract the following files before beginning.

=============== FILE: data/journey-candidates.md ===============
# Trellis journeys from the nightly regression suite — measured week 36

Runtime is the measured wall clock for that journey on the gate box, one worker.
Traffic is distinct beta users in the last 7 days.

| #  | Journey                                      | Weekly users | Runtime | Writes data | Notes |
|----|----------------------------------------------|-------------:|--------:|-------------|-------|
| 1  | Marketing home page loads                     | 41,000       | 8s      | no          | |
| 2  | Sign in with email and password               | 12,400       | 34s     | session only | covered by the existing check |
| 3  | Sign in with Google SSO                       | 3,900        | 41s     | session only | same destination as #2, different provider |
| 4  | Dashboard loads with live data                | 11,900       | 38s     | no          | covered by the existing check |
| 5  | Book a courier (the hero flow)                | 9,700        | 52s     | yes — creates a shipment | the product's reason to exist |
| 6  | Track a shipment by number                    | 8,600        | 29s     | no          | seeded shipment TRL-SEED-2 exists in every environment |
| 7  | Pay for a booking                             | 7,200        | 57s     | yes — takes payment | |
| 8  | Booking confirmation page                     | 7,100        | 22s     | no          | |
| 9  | Search the address book                       | 5,400        | 31s     | no          | |
| 10 | Search the address book sorted by last used   | 900          | 30s     | no          | same page as #9 with a query parameter |
| 11 | Invoice PDF export                            | 2,100        | 220s    | no          | renders 12 months of invoices |
| 12 | Bulk CSV import of 5,000 addresses            | 340          | 190s    | yes         | |
| 13 | Password reset by email                       | 1,800        | 95s     | yes         | polls a real mailbox for the link |
| 14 | Admin bulk-delete of users                    | 38           | 44s     | yes — destructive | |
| 15 | Referral invite send                          | 1,200        | 61s     | yes — sends live email | |
| 16 | Webhook replay console                        | 210          | 73s     | yes         | |
| 17 | Change plan (upgrade)                         | 480          | 66s     | yes         | |
| 18 | Download a shipping label PDF                 | 6,900        | 26s     | no          | uses seeded shipment TRL-SEED-2 |
| 19 | Notification bell opens                       | 9,100        | 18s     | no          | front-end only, no server call |
| 20 | Help centre article loads                     | 3,300        | 12s     | no          | separate CMS, deploys on its own schedule |
| 21 | Settings page loads                           | 4,800        | 24s     | no          | |
| 22 | Sign out                                      | 10,200       | 15s     | session only | |

=============== FILE: docs/launch-notes.md ===============
# Launch pipeline — what is already decided

## Stages

| Stage | What happens |
|---|---|
| Pre-merge on a PR | build, deploy to an ephemeral environment, run the deploy check, tear down |
| Post-merge to main | deploy to staging, run the deploy check against staging |
| Production deploy | deploy, then run the deploy check against production |

The pipeline job is capped at 10 minutes end to end. The ephemeral deploy inside
it takes about 4 minutes and the platform team says that is not moving before
launch. The gate box is a single runner with one worker, so plan on serial time.

## Environments

- **Ephemeral and staging** carry a carrier sandbox: shipments booked there are
  fake, cost nothing, and are swept nightly. Payment is test mode
  (`STRIPE_TEST_SECRET`); card `4242 4242 4242 4242` authorises.
- **Production** carries a read-only verification account (`verify-ro`), one
  seeded closed shipment `TRL-SEED-2` and one seeded past booking `TRL-SEED-9`.
  The account's role returns 403 on every write. Payment is live mode.

## The four asks

- **Ray (Finance):** "Put a real card through production on every deploy. I do
  not care what the sandbox says, I want to know money actually moved."
- **Nadia (Support):** "Admin bulk-delete. We broke it twice in beta and each
  time it took a week to notice."
- **Tom (Growth):** "Referral invites. The whole launch campaign is built on
  them and if they stop sending we lose the window."
- **Ana (Product):** "Shipment tracking. Half of beta support volume is people
  asking where their courier is — if tracking breaks we will know about it in
  an hour and it will be a bad hour."

=============== FILE: e2e/smoke/session.smoke.spec.ts ===============
import { test, expect } from '@playwright/test';

test('smoke: sign in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.VERIFY_EMAIL!);
  await page.getByLabel('Password').fill(process.env.VERIFY_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible({ timeout: 10000 });
});

test('smoke: dashboard loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('shipments-this-week')).toBeVisible();
});

=============== FILE: e2e/smoke/home.smoke.spec.ts ===============
import { test, expect } from '@playwright/test';

test('smoke: home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /book a courier/i })).toBeVisible();
});

=============== FILE: playwright.config.ts ===============
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  retries: 2,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL,
    trace: 'retain-on-failure',
  },
});
