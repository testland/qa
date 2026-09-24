# TICKET-4471 — Raise the webhook timestamp tolerance to 24 hours

**Opened** 2026-08-20 by @on-call · **Status** open, bounced twice

## Asks

(a) Set `WEBHOOK_TOLERANCE_SECONDS=86400`. A day is still a finite window, and
    this must not recur during a payments incident. +1 @rkeeling, +1 @amorse.

(b) If (a) is refused: skip the timestamp comparison entirely whenever the
    signature validates. A valid signature already proves the delivery came from
    Halcyon, so the timestamp is belt and braces on top of a proof. +1 @rkeeling.

(c) Log the difference between the delivery timestamp and the receiver's own clock
    on every rejection, so the next one of these is diagnosable in a minute rather
    than a fortnight. No objections raised.

(d) Page us when one receiver's clock differs from the rest of the fleet by more
    than thirty seconds. No objections raised.

## Attachment 1 — rejection log, exported from the central pipeline

The leading timestamp is pipeline ingest time. `ts` is the value in the delivery's
`webhook-timestamp` header; `now` is the value the rejecting process computed from
its own clock.

```
2026-08-19T03:12:02Z pay-hook-03 reject id=msg_4kQ8pV reason=timestamp_out_of_tolerance ts=1787109120 now=1787105942
2026-08-19T03:14:07Z pay-hook-03 reject id=msg_5mR1tA reason=timestamp_out_of_tolerance ts=1787109245 now=1787106067
2026-08-19T03:31:55Z pay-hook-03 reject id=msg_7pT4wQ reason=timestamp_out_of_tolerance ts=1787110313 now=1787107135
2026-08-19T03:52:58Z pay-hook-03 reject id=msg_9wX2cE reason=timestamp_out_of_tolerance ts=1787111576 now=1787108398
```

341 lines in total, first at 03:12:02Z and last at 03:52:58Z, every one of them
from `pay-hook-03`. Six receivers sit behind the load balancer, `pay-hook-01`
through `pay-hook-06`; the other five logged no rejections at all that night and
served normally throughout.

## Attachment 2 — rejection counts, August

| Day range               | Deliveries | `timestamp_out_of_tolerance` |
|-------------------------|-----------:|-----------------------------:|
| 2026-08-01 – 2026-08-18 |  2,410,883 |                            0 |
| 2026-08-19              |    138,240 |                          341 |
| 2026-08-20 – 2026-08-31 |  1,597,004 |                            0 |

## Attachment 3 — Halcyon status page, 2026-08-19

```
02:55 UTC  Investigating — elevated webhook delivery latency in eu-west.
03:48 UTC  Identified — a backlog in our delivery workers.
04:10 UTC  Resolved — backlog drained, delayed deliveries have been sent.
```

## Attachment 4 — Halcyon delivery semantics, from their integration guide

> Failed deliveries are retried on a fixed schedule for up to six hours. After the
> final attempt the delivery is marked permanently failed. Merchants can re-send
> any delivery from the dashboard or the API for 30 days after the original
> attempt.
