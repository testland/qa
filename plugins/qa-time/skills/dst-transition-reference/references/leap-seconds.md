# Leap-second mechanics and bug classes

A **leap second** is an extra second (23:59:60 UTC) inserted to keep UTC
within 0.9s of UT1. Per IERS Bulletin C
([datacenter.iers.org/data/latestVersion/bulletinC.txt](https://datacenter.iers.org/data/latestVersion/bulletinC.txt)),
insertions get ~6 months of notice. 27 were inserted 1972-2016 (most recent
2016-12-31); none since, and per the 27th CGPM resolution (2022) leap
seconds will be **abolished by 2035**. Audit this surface only when
second-granular progress matters: financial timestamping, distributed logs,
NTP-sensitive schedulers.

## Mechanics

| Property | Detail |
|---|---|
| Frequency | Irregular; announced by IERS Bulletin C |
| Insertion point | Last second of UTC June 30 or December 31 |
| Wire format | 23:59:60 UTC (a real 61st second of the minute) |
| POSIX `time_t` | Does NOT include leap seconds; it stalls or jumps back 1s on insertion |
| NTP | Carries a leap indicator; client handling varies (2012 Linux kernel-hang incident) |

Whether a host inserts a real 23:59:60 or **smears** it over 24 hours
(Google / AWS) is per-host - see
[smear-strategies-and-history.md](smear-strategies-and-history.md). A smear
is invisible to applications; a real insertion exposes the discontinuities
below.

## Bug classes

1. **`time_t` non-monotonicity** - on insertion the clock stalls
   (1483228799 repeats) or jumps; "1s of CPU = 1s of clock" breaks.
2. **Negative durations** - `time.time() - start` can go below zero across
   the insertion. Fix: monotonic clocks (`time.monotonic()`,
   `clock_gettime(CLOCK_MONOTONIC)`) for all duration measurement.
3. **NTP cascading** - OS-dependent handling of the leap indicator.
4. **Distributed clock skew** - one node steps, another smears; skew
   temporarily exceeds 1s. Per
   [AWS](https://aws.amazon.com/blogs/aws/look-before-you-leap-the-coming-leap-second-and-aws),
   AWS smears specifically to avoid this.

## Testable behaviours

| Behaviour | Test |
|---|---|
| Durations use a monotonic clock | `time.monotonic()` deltas stay >= 0 across the leap |
| Sortable timestamps don't collide | Sequence numbers / sub-second resolution beside stalled `time_t` |
| Cron at `00:00:00 UTC` of leap day | Fires exactly once |
| Per-host absorption strategy known | Verify step vs smear per host before comparing cross-node timestamps |

## Worked assertion - negative durations

```python
start = time.monotonic()
do_work()                     # crosses 2016-12-31 23:59:60 UTC
elapsed = time.monotonic() - start
assert elapsed >= 0           # holds; the time.time() form can trip
```

Simulate by pinning a fake clock to the last real leap second
(`freeze_time('2016-12-31 23:59:59 UTC')` - see the fake-clock-testing
skill) and advancing across it. Caveat: fake clocks can't replay the
OS-level leap indication - this asserts the code's clock choice, not the
kernel's behaviour; a real leap needs an OS-level test.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `time.time() - start` for durations | Wall clock; affected by leap | `time.monotonic()` |
| Treating `time_t` as continuous | Historical insertions broke it | Per [IANA leap-seconds.list](https://data.iana.org/time-zones/data/leap-seconds.list) |
| Hardcoding 86400 seconds-per-day | Only sometimes true | Calendar arithmetic |
| Assuming all servers smear | Some step | Verify per-host strategy |

## References

- IERS Bulletin C:
  [datacenter.iers.org/data/latestVersion/bulletinC.txt](https://datacenter.iers.org/data/latestVersion/bulletinC.txt)
  (archive: [datacenter.iers.org/availableVersions.php?id=16](https://datacenter.iers.org/availableVersions.php?id=16))
- Wikipedia leap second: [en.wikipedia.org/wiki/Leap_second](https://en.wikipedia.org/wiki/Leap_second)
- Google leap-smear: [developers.google.com/time/smear](https://developers.google.com/time/smear)
- Smear strategies + full insertion history:
  [smear-strategies-and-history.md](smear-strategies-and-history.md)
