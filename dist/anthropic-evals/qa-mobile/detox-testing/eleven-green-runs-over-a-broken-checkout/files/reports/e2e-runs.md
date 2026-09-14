# e2e job on `main`, builds 401-412

Configuration `ios.sim.debug`, 26 specs across 12 spec files, one simulator, no
retries configured.

| Build | Date       | Result | Suite | checkout | account | promos | search |
|-------|------------|--------|-------|----------|---------|--------|--------|
| 401   | 2026-07-02 | pass   | 38s   | 0.9s     | 15.4s   | 3.3s   | 6.1s   |
| 402   | 2026-07-09 | pass   | 39s   | 0.9s     | 15.9s   | 3.4s   | 6.2s   |
| 403   | 2026-07-16 | pass   | 37s   | 0.8s     | 15.1s   | 3.3s   | 6.0s   |
| 404   | 2026-07-23 | pass   | 41s   | 1.0s     | 16.2s   | 3.5s   | 6.4s   |
| 405   | 2026-07-30 | pass   | 38s   | 0.9s     | 15.5s   | 3.4s   | 6.2s   |
| 406   | 2026-08-06 | pass   | 40s   | 0.9s     | 15.8s   | 3.4s   | 6.3s   |
| 407   | 2026-08-13 | pass   | 39s   | 0.9s     | 15.3s   | 3.3s   | 6.1s   |
| 408   | 2026-08-20 | pass   | 44s   | 0.9s     | 21.6s   | 3.4s   | 6.2s   |
| 409   | 2026-08-27 | pass   | 43s   | 0.9s     | 21.4s   | 3.3s   | 6.2s   |
| 410   | 2026-09-03 | pass   | 42s   | 0.9s     | 21.5s   | 3.4s   | 6.1s   |
| 411   | 2026-09-08 | pass   | 43s   | 1.0s     | 21.7s   | 3.5s   | 6.3s   |
| 412   | 2026-09-10 | pass   | 43s   | 0.9s     | 21.6s   | 3.4s   | 6.2s   |

Notes collected while triaging:

- Nothing in the job has ever hit the 120s per-test limit. The whole suite has
  never taken more than 44 seconds.
- `account.test.js` went from ~15s to ~21s at build 408, which is when the
  `settle()` helper was merged into it.
- Timed by hand on the 412 simulator build: tapping the product, adding it,
  opening the basket and placing the order takes about four seconds from the
  first tap to the blank screen. It is not intermittent — it reproduces every
  time, on the simulator and on a device.
- The avatar upload goes out to the CDN. Instrumented on the CI runners it takes
  between 9.4s and 13.8s end to end, and it was that slow before build 408 as
  well.
- `promos.test.js` has gone red exactly once, on build 392, on `rejects an
  expired promo code`. Whoever fixed it that afternoon edited that one spec and
  nothing else in the file. Green on every run since.
