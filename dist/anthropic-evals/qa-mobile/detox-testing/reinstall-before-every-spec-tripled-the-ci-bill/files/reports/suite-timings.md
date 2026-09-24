# e2e suite timings, ios.sim.debug, single simulator

## Before 2026-08-29 - no shared hook, order-dependent

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
| onboarding.test.js   | 2     | 0m40s    |
| **total**            | 24    | **4m12s**|

Green only file by file. Full-suite run: 14 of 24 specs failed.

Every one of those 14 failures was on the first line of a spec, and every one
named an element belonging to a screen the previous file had navigated away
from. Not one of them was a stale cart total, a stale filter, a signed-in
session that should not have been, or a welcome tour that should have been
offered and was not.

## After 2026-08-29 - uninstall + reinstall before every spec

24 of 24 green. **44m56s.** macOS runner minutes: August 610, September 1780
and counting.

## Priya's branch, PR #764 - fresh process + 1.5s settle before every spec

24 of 24 green, nine consecutive nights. **9m50s.**

## What we have actually measured on our runner

| Operation                                      | Cost   |
|------------------------------------------------|--------|
| uninstall + install + cold start               | 1m52s  |
| starting a fresh process of the installed app  | 6.5s   |

Nobody has instrumented anything else.
