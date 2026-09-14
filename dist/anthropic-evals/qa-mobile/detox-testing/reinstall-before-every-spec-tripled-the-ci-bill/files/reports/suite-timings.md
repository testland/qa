# e2e suite timings, ios.sim.debug, single simulator

## Before 2026-08-29 (no shared beforeEach, order-dependent)

| Spec file            | Specs | Duration |
|----------------------|-------|----------|
| browse.test.js       | 2     | 0m19s    |
| cart.test.js         | 2     | 0m22s    |
| checkout.test.js     | 4     | 0m48s    |
| account.test.js      | 3     | 0m31s    |
| orders.test.js       | 3     | 0m34s    |
| search.test.js       | 2     | 0m18s    |
| promos.test.js       | 2     | 0m21s    |
| deeplink.test.js     | 2     | 0m26s    |
| permissions.test.js  | 2     | 0m33s    |
| **total**            | 22    | **4m12s**|

Green only when run file-by-file. Full-suite run: 14 of 22 specs failed, all
with `element(...) not found` on the first line of the spec.

## After 2026-08-29 (uninstall + reinstall in beforeEach)

| Spec file            | Specs | Duration |
|----------------------|-------|----------|
| browse.test.js       | 2     | 3m44s    |
| cart.test.js         | 2     | 3m45s    |
| checkout.test.js     | 4     | 7m28s    |
| account.test.js      | 3     | 5m36s    |
| orders.test.js       | 3     | 5m37s    |
| search.test.js       | 2     | 3m44s    |
| promos.test.js       | 2     | 3m43s    |
| deeplink.test.js     | 2     | 3m46s    |
| permissions.test.js  | 2     | 3m45s    |
| onboarding.test.js   | 2     | 3m48s    |
| **total**            | 24    | **44m56s**|

24 of 24 green. `onboarding.test.js` was added on 2026-09-02 and so does not
appear in either of the other two runs below.

Instrumented on our runner, per spec:

| Operation                                   | Cost   |
|---------------------------------------------|--------|
| uninstall + install + cold start            | 1m52s  |
| cold relaunch of the already-installed app  | 6.5s   |
| JS reload of the running app                | 0.8s   |

macOS runner minutes: August 610, September 1780 and counting.

## Dana's attempt, 2026-08-21 (reset between specs, no reinstall)

Suite ran in 4m38s. 19 of 22 green, which was a big improvement on 8 of 22.
The three that broke, and had not been broken before:

```
FAIL e2e/deeplink.test.js
  x opens straight to an order when launched from a larder:// link
      Expected element with id "order-detail-9912" to be visible.
      Got: element with id "home-screen" is visible.
  x opens the tracking map from a tracking link
      Expected element with id "tracking-map" to be visible.
      Got: element with id "home-screen" is visible.

FAIL e2e/permissions.test.js
  x hides the opt-in banner when notifications are already granted
      Expected element with id "notifications-optin-banner" not to be visible.
      Got: element with id "notifications-optin-banner" is visible.
```

Dana's note: "out of time, handing back."
