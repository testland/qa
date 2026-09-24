# deploy-gate run 8841 — build 2026.9.11-a41c0b9 — FAILED

Started 18:04, finished 18:30. 26m 02s wall clock. 12 tests, `--retries=2`,
`--workers=1`.

| Step                                | Duration |
|-------------------------------------|---------:|
| checkout + setup-node + npm ci      | 1m 05s   |
| playwright install                  | 2m 15s   |
| deploy ephemeral env                | 7m 10s   |
| Gate                                | 15m 29s  |
| upload-artifact                     | 0m 03s   |

Per test:

| Test                                      |  Att 1  |  Att 2  |  Att 3  | Final |
|-------------------------------------------|--------:|--------:|--------:|-------|
| smoke: home page loads                    |    6.0s |       — |       — | pass  |
| smoke: catalogue page loads               |    9.0s |       — |       — | pass  |
| smoke: sign in                            |   14.0s |       — |       — | pass  |
| smoke: account page loads                 |   11.0s |       — |       — | pass  |
| smoke: search returns results             | 5.4s  F |    9.1s |       — | pass  |
| smoke: product page loads                 |    8.0s |       — |       — | pass  |
| smoke: add to cart                        |   13.0s |       — |       — | pass  |
| smoke: cart totals                        |   12.0s |       — |       — | pass  |
| smoke: invoice export renders             |  751.0s |       — |       — | pass  |
| smoke: sign in -> add to cart -> checkout | 24.4s F | 24.1s F | 24.6s F | FAIL  |
| smoke: order history loads                |   10.0s |       — |       — | pass  |
| smoke: sign out                           |    7.0s |       — |       — | pass  |

`smoke: search returns results`, attempt 1:

    TimeoutError: locator.click: Timeout 5000ms exceeded.
    waiting for getByRole('button', { name: 'Search' })
      at e2e/smoke/search.smoke.spec.ts:8

`smoke: sign in -> add to cart -> checkout`, attempt 1:

    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /order confirmed/i })
    Received: page shows "Payment declined — please try another card"
      at e2e/smoke/checkout.smoke.spec.ts:21

`smoke: sign in -> add to cart -> checkout`, attempt 2:

    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /order confirmed/i })
    Received: page shows "Payment declined — please try another card"
      at e2e/smoke/checkout.smoke.spec.ts:21

`smoke: sign in -> add to cart -> checkout`, attempt 3:

    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: /order confirmed/i })
    Received: page shows "Payment declined — please try another card"
      at e2e/smoke/checkout.smoke.spec.ts:21
