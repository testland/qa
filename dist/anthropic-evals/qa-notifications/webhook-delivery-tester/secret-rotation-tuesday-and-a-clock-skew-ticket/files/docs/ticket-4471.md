# TICKET-4471 — Raise the webhook timestamp tolerance to 24 hours

**Opened** 2026-08-20 by @on-call · **Status** open, bounced twice

## Request

On 2026-08-19 between 03:12 and 03:53 UTC the endpoint rejected 341 Halcyon
deliveries with `timestamp_out_of_tolerance`. Halcyon's dashboard shows all 341
as permanently failed — their retry budget expired inside the same window.

Proposal: set `WEBHOOK_TOLERANCE_SECONDS=86400`. A day is still a finite window,
and this must not recur during a payments incident. +1 @rkeeling, +1 @amorse.

## Attachment 1 — chrony report, receiver host pay-hook-03

```
2026-08-19T03:08:41Z  chronyd: Can't synchronise: no selectable sources
2026-08-19T03:12:02Z  System clock wrong by -3180.442 seconds
2026-08-19T03:53:20Z  System clock wrong by -3180.219 seconds
2026-08-19T03:53:21Z  chronyd: Selected source 169.254.169.123
2026-08-19T03:53:21Z  System clock was stepped by +3180.331 seconds
```

Host was running without a selectable time source for 44 minutes. The other five
receiver hosts were synchronised throughout and served normally.

## Attachment 2 — rejection counts, August

| Day range              | Deliveries | `timestamp_out_of_tolerance` |
|------------------------|-----------:|-----------------------------:|
| 2026-08-01 – 2026-08-18|  2,410,883 |                            0 |
| 2026-08-19             |    138,240 |                          341 |
| 2026-08-20 – 2026-08-31|  1,597,004 |                            0 |

## Attachment 3 — Halcyon delivery semantics, from their integration guide

> Failed deliveries are retried on a fixed schedule for up to six hours. After
> the final attempt the delivery is marked permanently failed. Merchants can
> re-send any delivery from the dashboard or the API for 30 days after the
> original attempt.
