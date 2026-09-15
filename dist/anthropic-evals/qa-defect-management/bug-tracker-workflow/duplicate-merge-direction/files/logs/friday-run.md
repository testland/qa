# Dedupe run 2026-08-14, 16:02-16:09

The script walks every open report in the area, and for each one calls the
search endpoint to find the reports that look like it, before it groups them.

```
16:02:11  scanning 63 candidates in area promo/checkout
16:04:40  group formed: [398, 412] canonical=398 (oldest)
16:04:41  closed #412  -> state_reason=completed
16:06:02  search 403  x-ratelimit-remaining: 0   x-ratelimit-reset: 16:35:00
16:06:02  search 403  x-ratelimit-remaining: 0
16:06:03  aborted after 31 of 63 candidates
16:06:03  step 'carry comments to canonical' not reached
```
