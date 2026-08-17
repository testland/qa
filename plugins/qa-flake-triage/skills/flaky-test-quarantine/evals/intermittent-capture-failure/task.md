# Two payment tests failing intermittently, both look the same from the dashboard

## Problem Description

Our flake dashboard ranks tests by failure rate over the last thirty days. Two
payment tests are near the top and both sit in the single-digit-percent range,
which is where our team has historically taken tests out of the blocking path
so the trunk stays usable.

The billing team has asked us to do exactly that for both of them this week.
Their argument is that neither failure has ever been reproducible on demand,
both fail on a minority of runs, and the on-call rotation is tired of being
paged by CI.

I pulled the actual failure output for both, and the support team's incident
log for the same window, because our SRE mentioned in passing that something
about the capture numbers looked familiar. Both are attached.

We need a decision today with the reasoning written down, because whatever we
decide gets quoted back at us the next time this comes up.

## Output Specification

1. Write `docs/triage-2026-08-17.md` — a decision for each of the two tests
   with the evidence you based it on, and, for anything not taken out of the
   blocking path, where it goes instead and who receives it.
2. Edit `tests/payments.spec.ts` only for the test or tests your decision
   covers. Leave the rest of the file exactly as it is.
3. Write `docs/skipped-tests.md` only if something was taken out of the
   blocking path.

## Input Files

Extract the following files before beginning.

=============== FILE: reports/flake-rates.csv ===============
test_name,runs_30d,failures_30d,failure_rate,fails_on_projects
payment capture succeeds,312,26,8.3%,chromium+tablet-768
payment page renders card form,312,19,6.1%,tablet-768

=============== FILE: reports/failure-output.md ===============
# Captured failure output, last 30 days

## payment capture succeeds — 26 failures

All 26 failures share the same output:

    Error: expect(received).toHaveText(expected)
    Expected: "captured"
    Received: "failed"
      at tests/payments.spec.ts:9

Network log attached to each failure shows the same upstream response:

    POST /api/v1/payments/capture -> 503 Service Unavailable
    x-upstream: pay-gateway-eu-3
    body: {"error":"acquirer_timeout","retryable":true}

The 503s cluster: 21 of the 26 fell between 18:00 and 20:00 UTC.

## payment page renders card form — 19 failures

All 19 failures share the same output:

    TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
    waiting for frameLocator('#card').getByLabel('Card number')

No failing network calls in any of the 19. The card iframe finishes loading
between 4.6s and 7.1s on the tablet-768 project; the assertion waits 5s.
Chromium loads it in under 2s and has never failed.

=============== FILE: support/incident-log.md ===============
# Customer incidents, last 30 days (billing only)

| ID       | Opened     | Summary                                                  | Status |
|----------|------------|----------------------------------------------------------|--------|
| INC-2291 | 2026-07-24 | 3 customers report "payment failed" then card charged     | open   |
| INC-2340 | 2026-08-06 | Batch of 11 declined captures, all 18:40–19:20 UTC        | open   |
| INC-2355 | 2026-08-12 | Customer charged twice for one order                      | open   |
| INC-2361 | 2026-08-14 | Checkout error at peak hours, resolved on customer retry   | open   |

Support note on INC-2340: "acquirer returned a timeout; our side surfaced a
generic failure. Volume was ~4% of captures in that window."

=============== FILE: tests/payments.spec.ts ===============
import { test, expect } from '@playwright/test';

test('payment capture succeeds', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByTestId('capture-status')).toHaveText('captured');
});

test('payment page renders card form', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.frameLocator('#card').getByLabel('Card number')).toBeVisible();
});

test('payment history lists prior charges', async ({ page }) => {
  await page.goto('/billing/history');
  await expect(page.getByRole('row')).toHaveCount(6);
});
