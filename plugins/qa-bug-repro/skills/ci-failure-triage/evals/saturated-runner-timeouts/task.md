# Payments integration test times out about half the time

## Problem Description

`payments.integration.spec.ts` times out at 20s on roughly half the morning
runs. It has been like this for two weeks. The standing instruction from the
last incident review is "the payments team makes the authorisation call
faster", and the payments team has been working to that: they have an open PR
that shaves about 40ms off the call, which is not going to close a 20-second
gap and they know it.

Their tech lead asked us to check whether the request is even reasonable before
they spend another sprint on it. Nobody has looked at anything except the
payments test itself, because that is the one that goes red most often.

We have the failing run, a post-job resource capture, and the failure history
for the workflow. We want a written determination of what this failure actually
is and who should be acting on it.

## Output Specification

Produce `triage-payments-timeout.md` containing:

1. What kind of failure this is and who owns the next action.
2. The evidence from the attached files that supports it, quoting the specific
   lines and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. The next action, and whether the payments team's current work is the right
   thing for them to be doing.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: writing or reviewing the payments performance change, editing
tests, changing timeouts, or drafting a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/integration-6620.log ===============
2026-08-17T08:41:12Z ##[group]Runner Image
2026-08-17T08:41:12Z Image: ubuntu-24.04   Version: 20260810.1.0   Label: acme-shared-pool   Hardware: 2 vCPU / 8 GB
2026-08-17T08:41:12Z ##[endgroup]
2026-08-17T08:41:14Z ##[group]Run npx mocha --timeout 20000 'tests/integration/**/*.spec.ts'
2026-08-17T08:43:52Z   inventory: reserves stock for an order (11412ms)
2026-08-17T08:44:31Z   1) inventory: releases a reservation on cancel
2026-08-17T08:44:31Z      Error: Timeout of 20000ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves.
2026-08-17T08:44:31Z          at listOnTimeout (node:internal/timers:581:17)
2026-08-17T08:46:03Z   search: returns paged results (9884ms)
2026-08-17T08:46:44Z   2) search: applies a facet filter
2026-08-17T08:46:44Z      Error: Timeout of 20000ms exceeded.
2026-08-17T08:47:59Z   payments: refunds a captured charge (13221ms)
2026-08-17T08:48:20Z   3) payments: settles a card authorisation
2026-08-17T08:48:20Z      Error: Timeout of 20000ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves.
2026-08-17T08:48:20Z          at Context.<anonymous> (tests/integration/payments.integration.spec.ts:29:5)
2026-08-17T08:48:41Z   accounts: updates a billing address (8107ms)
2026-08-17T08:48:55Z   41 passing (7m41s)
2026-08-17T08:48:55Z   3 failing
2026-08-17T08:48:56Z ##[group]Post job: resource capture (mpstat -P ALL 1 3 | tail, uptime)
2026-08-17T08:48:56Z 08:48:56 up 12 min,  load average: 13.94, 12.41, 9.83
2026-08-17T08:48:56Z Average:     CPU    %usr   %nice    %sys %iowait   %steal   %idle
2026-08-17T08:48:56Z Average:     all   38.11    0.00    9.44   14.02    31.20    7.23
2026-08-17T08:48:56Z ##[endgroup]
2026-08-17T08:48:57Z ##[error]Process completed with exit code 1.

=============== FILE: ci/workflow-history.md ===============
## Integration workflow, last 50 runs

| When runs started | Runs | Runs with >=1 timeout | Tests that timed out |
|---|---|---|---|
| weekdays 08:00-10:00 UTC | 21 | 17 | payments (14), inventory (11), search (9), accounts (4), reporting (3) |
| all other times | 29 | 1 | payments (1) |

- Median suite duration 08:00-10:00 UTC: 7m34s. Median at other times: 2m21s.
- Median duration of `payments: settles a card authorisation` when it passes:
  1.9s at off-peak times, 14.8s during 08:00-10:00 UTC.
- Runner image `ubuntu-24.04 / 20260810.1.0` and label `acme-shared-pool` on all
  50 runs; no change in the window.
- `acme-shared-pool` is shared with the data platform's nightly and morning
  backfill jobs.
- No quarantine list or flake list exists in this repository.

## Changes in the window

```
$ git log --oneline --since=2026-08-03
f10a92b (2026-08-16) feat(web): new empty-state illustration on the dashboard
2b7cc41 (2026-08-12) docs: update the on-call handbook
9de0f03 (2026-08-06) chore(web): remove an unused stylesheet
```

```
$ git log --oneline --since=2026-08-03 -- src/payments/ src/inventory/ src/search/
(no commits)
```

- The payments performance change is in PR #3391, open and unmerged.
