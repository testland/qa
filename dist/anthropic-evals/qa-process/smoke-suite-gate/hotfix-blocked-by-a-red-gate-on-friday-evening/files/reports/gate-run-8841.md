# deploy-gate run 8841 — build 2026.9.11-a41c0b9 — FAILED

Started 18:04, finished 18:35. 31m 12s wall clock. 11 tests, `--retries=2`,
`--workers=2`. The job has no time limit set on it.

| Test                                      | Att 1 | Att 2 | Att 3 | Final |
|-------------------------------------------|-------|-------|-------|-------|
| smoke: home page loads                    | pass  | —     | —     | pass  |
| smoke: catalogue page loads               | pass  | —     | —     | pass  |
| smoke: sign in                            | pass  | —     | —     | pass  |
| smoke: account page loads                 | pass  | —     | —     | pass  |
| smoke: search returns results             | fail  | pass  | —     | pass  |
| smoke: product page loads                 | pass  | —     | —     | pass  |
| smoke: add to cart                        | pass  | —     | —     | pass  |
| smoke: cart totals                        | pass  | —     | —     | pass  |
| smoke: sign in -> add to cart -> checkout | fail  | fail  | fail  | FAIL  |
| smoke: order history loads                | pass  | —     | —     | pass  |
| smoke: sign out                           | pass  | —     | —     | pass  |

`smoke: search returns results`, attempt 1:

    TimeoutError: locator.click: Timeout 5000ms exceeded.
    waiting for getByRole('button', { name: 'Search' })
      at e2e/smoke/search.smoke.spec.ts:8

  Attempt 2 passed in 9.1s.

`smoke: sign in -> add to cart -> checkout`, attempts 1, 2 and 3,
byte-identical each time:

    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /order confirmed/i })
    Received: page shows "Payment declined — please try another card"
      at e2e/smoke/checkout.smoke.spec.ts:21

  No timeout. No network error. 24.4s, 24.1s, 24.6s.

Runner note: the 31 minutes is the ephemeral deploy (7m) plus three attempts of
a suite that is 4m40s clean.
