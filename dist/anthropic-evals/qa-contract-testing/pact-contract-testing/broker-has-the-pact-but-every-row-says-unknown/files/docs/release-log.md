# Production release log (kept by hand by the platform team)

Broker environments (`production`) were created 2026-08-19. Nothing in either
repo's pipeline writes to the broker on release; the entries below are typed in
by whoever ran the release.

| Date       | Service               | Version | Note                                                    |
|------------|-----------------------|---------|---------------------------------------------------------|
| 2026-07-14 | notifications-worker  | 0b8e442 | receipts UI                                             |
| 2026-08-04 | orders-api            | 3f00c19 | current                                                 |
| 2026-08-21 | (merged, not shipped) | —       | PR #7702 — drop `channel` from the notification payload |
| 2026-09-02 | (merged, not shipped) | —       | PR #7744 — bulk send throttle                           |

`notifications-worker` has not been released since 2026-07-14; its `main` has
moved on and the release train for that service is monthly. `orders-api` has not
been released since 2026-08-04, because the deploy gate has never gone green and
the team has been waiting for it rather than shipping around it.
