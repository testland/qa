# Production release log (kept by hand by the platform team)

Broker environments (`production`) were created 2026-08-19. The release scripts in
`scripts/` are what write to the broker; the table below is typed in by whoever ran
the release.

| Date       | Service               | Commit  | Tag / manifest version | Note                                                    |
|------------|-----------------------|---------|------------------------|---------------------------------------------------------|
| 2026-07-14 | notifications-worker  | 0b8e442 | v2.8.0                 | receipts UI                                             |
| 2026-08-04 | orders-api            | 3f00c19 | 4.12.0                 | current                                                 |
| 2026-08-21 | (merged, not shipped) | 7c9a115 | -                      | PR #7702 - drop `channel` from the notification payload |
| 2026-09-02 | (merged, not shipped) | 2ab7d40 | -                      | PR #7744 - bulk send throttle                           |

`notifications-worker` has not been released since 2026-07-14; its `main` has moved
on and the release train for that service is monthly. `orders-api` has not been
released since 2026-08-04, because the deploy gate has never gone green and the
team has been waiting for it rather than shipping around it.

Neither manifest version has been bumped since the services were split out of the
old monolith in March; `4.12.0` and `2.8.0` have covered every release either
service has made this year.
