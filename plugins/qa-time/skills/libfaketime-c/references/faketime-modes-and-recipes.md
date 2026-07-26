# libfaketime modes and recipes

Deeper variants beyond the core absolute-date mode. All flags and syntax
per [github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime).

## Relative offset

Move the clock a fixed delta from real time instead of pinning an absolute
instant:

```bash
faketime '-1d' your_command         # 1 day in the past
faketime '+1y' your_command         # 1 year in the future
faketime '+2h30m' your_command      # 2h30m ahead
```

## Advance-rate (time speed-up / slow-down)

The `-f` flag plus an `@start xRATE` spec starts at a fixed instant and
advances faster (or slower) than real time:

```bash
faketime -f '@2026-12-31 23:59:00 x10' your_command
# Starts at 23:59:00 on 2026-12-31, advances 10x real-time
```

Useful for testing schedulers, cron simulations, and long-running clock
progress.

## High-resolution mode

```bash
FAKETIME_NO_CACHE=1 faketime '2026-12-31 23:59:00' your_command
```

Disables the per-second caching libfaketime does for performance. Tests that
read time hundreds of times per second then see consistent behaviour.

## Recipes

### Spring-forward (non-existent local time)

```bash
faketime '2026-03-08 02:30:00 EDT' ./my-program
# Tests behaviour at a non-existent local time (spring-forward) per
# dst-transition-reference
```

### Cron-job time-skip

```bash
# Simulate a year in ~10 minutes (1 sec real = 1.46 hrs simulated)
faketime -f '@2026-01-01 00:00:00 x5256' ./cron-runner
```

### Combined with a timezone

```bash
TZ='America/New_York' faketime '2026-03-08 02:30:00' ./my-program
```
