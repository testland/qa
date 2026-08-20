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
