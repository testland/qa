# Per-category test catalog

The test cases each touchpoint category should exercise. Pick the
rows matching the category assigned during inventory (Step 1).

## Storage tests

| Test | Pattern |
|---|---|
| Round-trip RFC 3339 | parse → emit → parse → assert equal |
| Round-trip via JSON | serialise object → deserialise → assert |
| Microsecond precision preserved | `.123456Z` survives DB store/load |
| Zone information preserved or normalized to UTC | Document the policy |

## Business-logic tests

| Test | Pattern |
|---|---|
| DST spring-forward | Schedule at 02:30 local on transition day; verify behaviour |
| DST fall-back | Same 01:30 local appearing twice; verify ordering |
| Leap day Feb 29 | "1 year from Feb 29 2024" → Feb 28 2025 (Per ICU) |
| Year-end rollover | "Tomorrow" on Dec 31 |
| Month-end | Jan 31 + 1 month = Feb 28 / 29 (per library) |
| Negative durations | Operations on "5 minutes ago" |
| Leap second tolerance | Code uses monotonic time per `leap-second-reference` |

## Cron tests

| Test | Pattern |
|---|---|
| Daily 02:30 EST cron on spring-forward | Doesn't fire OR fires at 03:30 (per cron spec) |
| Daily 01:30 EST cron on fall-back | Fires once vs twice (per spec) |
| Monthly on Feb 29 (non-leap year) | Fires on Feb 28 OR not at all |
| Weekly cron crossing DST | 1-hour offset for one week |

## Billing tests

| Test | Pattern |
|---|---|
| Billing on month-end across leap year | Feb 28 vs Feb 29 handling |
| Billing window across DST | Hour gain / loss in the period |
| Pro-ration calculation | Across DST boundary |
| Multi-tenant timezone variance | Same wall-clock hour ≠ same UTC |

## Display tests

| Test | Pattern |
|---|---|
| Per-user TZ formatting | User in `Asia/Tokyo` sees `09:00 JST`; user in `Europe/London` sees `00:00 GMT` |
| ISO 8601 vs human-readable | Localised display ≠ wire format |
| 24h vs 12h convention | Per user locale |
| Relative time ("2 hours ago") | Per system locale |
