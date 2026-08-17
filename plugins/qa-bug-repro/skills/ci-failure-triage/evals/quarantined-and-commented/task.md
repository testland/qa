# Smoke run has two reds and someone says both are known flaky

## Problem Description

The smoke run on the merge queue came back with two failures. The dev on
rotation looked at both and said "those two are our usual flaky pair, hit
rerun" - one of them is on the flake list the team maintains, and the other one
has a comment in the test file saying it flakes in CI.

The lead does not want that waved through. Last quarter we called a red "known
flaky", reran it green, and shipped a rounding bug to invoicing that a customer
found. Since then the rule is that anything called flaky has to be written down
with the evidence.

The merge queue is blocked while this sits. We want each of the two failures
looked at on its own and the reasoning recorded, so that whoever reruns has
something to point at afterwards.

## Output Specification

Produce `triage-smoke-3310.md` containing, for each of the two failures
separately:

1. What kind of failure it is and who owns the next action.
2. The evidence from the attached files, quoting the specific lines and values
   you relied on - including what the evidence is, not just that it exists.
3. The other explanations you considered and the specific observed value that
   rules each one out.
4. The next action for that failure.

If the attached material does not settle one of them, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: editing tests, adding retries, rerunning anything, or drafting a
bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/smoke-3310.log ===============
2026-08-14T11:02:41Z ##[group]Run npx playwright test --project=chromium --reporter=list
2026-08-14T11:02:44Z [flake-guard] loaded flake-list.yml (1 active entry, 0 expired)
2026-08-14T11:03:58Z   ok 1 tests/cart/add-remove.spec.ts:14:3 › removes the last line item (7.2s)
2026-08-14T11:04:20Z   ok 2 tests/cart/coupon.spec.ts:9:3 › rejects an expired coupon (5.9s)
2026-08-14T11:05:02Z   x  3 tests/notifications.spec.ts:88:3 › shows the toast after a comment
2026-08-14T11:05:02Z [flake-guard] tests/notifications.spec.ts:88 matches flake-list.yml entry #12
2026-08-14T11:05:02Z [flake-guard]   pattern: async-wait   quarantined: 2026-06-02   review-by: 2026-09-01   owner: @notifications
2026-08-14T11:05:02Z     Error: Timed out 15000ms waiting for expect(locator).toBeVisible()
2026-08-14T11:05:02Z     Locator: getByTestId('toast')
2026-08-14T11:05:02Z     Expected: visible
2026-08-14T11:05:02Z       at tests/notifications.spec.ts:94:38
2026-08-14T11:06:33Z   x  4 tests/billing/invoice.spec.ts:57:3 › totals a multi-line invoice
2026-08-14T11:06:33Z     Error: expect(received).toEqual(expected)
2026-08-14T11:06:33Z     - Expected  - 1
2026-08-14T11:06:33Z     + Received  + 1
2026-08-14T11:06:33Z       Object {
2026-08-14T11:06:33Z         "currency": "EUR",
2026-08-14T11:06:33Z     -   "totalCents": 14400,
2026-08-14T11:06:33Z     +   "totalCents": 14382,
2026-08-14T11:06:33Z       }
2026-08-14T11:06:33Z       at tests/billing/invoice.spec.ts:64:31
2026-08-14T11:06:40Z   ok 5 tests/billing/dunning.spec.ts:21:3 › retries a failed charge (6.4s)
2026-08-14T11:06:52Z   2 failed, 41 passed (3m58s)
2026-08-14T11:06:53Z ##[error]Process completed with exit code 1.

=============== FILE: flake-list.yml ===============
# Tests quarantined out of the blocking smoke gate.
# Adding an entry requires a linked issue and a review-by date <= 90 days out.
entries:
  - id: 12
    test: "tests/notifications.spec.ts:88"
    pattern: async-wait
    issue: NOTIF-771
    quarantined: 2026-06-02
    review-by: 2026-09-01
    owner: "@notifications"

=============== FILE: tests/billing/invoice.spec.ts ===============
import { test, expect } from '@playwright/test';
import { buildInvoice } from '../../src/billing/buildInvoice';

// flaky in CI sometimes, just retry if it goes red - see #4412
test('totals a multi-line invoice', async () => {
  const invoice = buildInvoice([
    { description: 'Seat', qtyCents: 9900, taxRate: 0.2 },
    { description: 'Support', qtyCents: 2100, taxRate: 0.2 },
  ]);
  expect(invoice).toEqual({ currency: 'EUR', totalCents: 14400 });
});

=============== FILE: ci/history-3310.md ===============
## Per-test history, last 50 smoke runs

| Test | Failures in 50 | Shape of the failures |
|---|---|---|
| tests/notifications.spec.ts:88 | 6 | all six are the same 15000ms toast-visibility timeout; 4 of the 6 passed on the next run of the same commit |
| tests/billing/invoice.spec.ts:57 | 1 (this run) | 31 consecutive passes before it; the merge-queue retry of the same commit at 11:19 produced the identical 14382 |

- Runner image `ubuntu-24.04 / 20260810.1.0`, unchanged for 11 days.
- Issue #4412, referenced in the invoice test comment, was closed 2026-03-04 as
  "could not reproduce". It is not linked from flake-list.yml.

## Changes in the window

```
$ git log --oneline --since=2026-08-13
c8e1f40 (2026-08-14 09:12) feat(billing): apply per-line tax rounding
77ab205 (2026-08-13 16:40) chore(deps): bump eslint to 9.12.0
```

```
$ git show c8e1f40 -- src/billing/buildInvoice.ts
@@ export function buildInvoice(lines: Line[]) {
-  const net = lines.reduce((sum, l) => sum + l.qtyCents, 0);
-  const totalCents = Math.round(net * (1 + lines[0].taxRate));
+  const totalCents = lines.reduce(
+    (sum, l) => sum + Math.round(l.qtyCents * (1 + l.taxRate)),
+    0,
+  );
   return { currency: 'EUR', totalCents };
 }
```
