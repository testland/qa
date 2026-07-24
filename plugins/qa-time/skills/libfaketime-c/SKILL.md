---
name: libfaketime-c
description: "Wraps libfaketime (github.com/wolfcw/libfaketime), the LD_PRELOAD library that intercepts time() / gettimeofday() / clock_gettime() for any binary. Covers absolute-date mode (FAKETIME='2026-12-31 23:59:00'), relative offset (FAKETIME='-1d'), advance-rate (FAKETIME='@2026-12-31 23:59:00 x5' for 5x speed), per-process scope via LD_PRELOAD, and the FAKETIME_NO_CACHE for high-resolution mocking. Use when testing C/C++/any-native-binary code that needs deterministic wall-clock time."
---

# libfaketime-c

## Overview

`libfaketime` is the canonical LD_PRELOAD library for faking
time on Linux/macOS. Per
[github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime),
it intercepts the libc functions `time()`, `gettimeofday()`,
`clock_gettime()`, and similar, returning a value derived from
environment variables instead of the real clock.

Works for **any binary** that uses libc time functions - not
just C/C++. Useful for Go, Rust, Python, anything-not-statically-
linked.

## When to use

- Testing C/C++ code that uses libc time.
- Testing any process where you don't control the source.
- Integration tests where one process's perceived clock matters.
- CI tests for time-sensitive logic without overriding system
  clock.

## Authoring

### Install

```bash
# Debian/Ubuntu
sudo apt install faketime

# macOS
brew install libfaketime

# From source
git clone https://github.com/wolfcw/libfaketime
cd libfaketime && make && sudo make install
```

### Basic absolute-date mode

```bash
faketime '2026-12-31 23:59:00' your_command
```

`your_command` runs as if the wall clock is `2026-12-31 23:59:00`.

Alternative via LD_PRELOAD directly:

```bash
LD_PRELOAD=/usr/local/lib/faketime/libfaketime.so.1 \
  FAKETIME='2026-12-31 23:59:00' \
  your_command
```

### Relative offset

```bash
faketime '-1d' your_command         # 1 day in the past
faketime '+1y' your_command         # 1 year in the future
faketime '+2h30m' your_command      # 2h30m ahead
```

### Advance-rate (time-speedup / time-slowdown)

```bash
faketime -f '@2026-12-31 23:59:00 x10' your_command
# Starts at 23:59:00 on 2026-12-31, advances 10x real-time
```

Useful for testing schedulers, cron simulations, "long-running
clock progress."

### High-resolution mode

```bash
FAKETIME_NO_CACHE=1 faketime '2026-12-31 23:59:00' your_command
```

Disables the per-second caching libfaketime does for performance.
Tests that read time hundreds of times per second see consistent
behaviour.

## Running

### Basic test

```bash
faketime '2026-03-08 02:30:00 EDT' ./my-program
# Tests behaviour at non-existent local time (spring-forward) per
# dst-transition-reference
```

### Cron-job time-skip test

```bash
# Simulate a year in 10 minutes (1 sec real = 1.46 hrs simulated)
faketime -f '@2026-01-01 00:00:00 x5256' ./cron-runner
```

### Combined with timezone

```bash
TZ='America/New_York' faketime '2026-03-08 02:30:00' ./my-program
```

## Parsing results

libfaketime doesn't emit output itself - it transparently
intercepts time syscalls. Your tests assert on the program's
visible behaviour:

```python
import subprocess

def test_cron_fires_at_midnight():
    result = subprocess.run(
        ["faketime", "2026-12-31 23:59:30", "./cron-runner"],
        capture_output=True,
        text=True,
        timeout=5,
    )
    assert "Fired at 2027-01-01 00:00:00" in result.stdout
```

## CI integration

```yaml
jobs:
  time-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: sudo apt-get install -y faketime
      - run: pytest tests/time/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Try to use libfaketime on statically-linked binaries | LD_PRELOAD has no symbols to intercept | Use a language-native fake-clock |
| Forget `LD_PRELOAD` path | Defaults to no-op | Use `faketime` wrapper instead of raw `LD_PRELOAD` |
| Time-skip too fast | Tests can't see intermediate states | Tune `x<rate>` to test needs |
| Spring-forward test forgets `TZ` | UTC-only fake time; DST tests need local zone | `TZ='America/New_York' faketime ...` |
| Forget `FAKETIME_NO_CACHE=1` for fast-polling tests | Time stalls between cache refreshes | Set explicitly |
| Use against the JVM | Some JVM time methods bypass libc | Use `mockclock-jvm` |
| Use against Workers / Edge / browser | LD_PRELOAD not applicable | Use language-native fakes |

## Limitations

- **Linux + macOS only.** Windows uses different time syscalls.
- **Statically linked binaries unaffected.** Go binaries compiled
  with `CGO_ENABLED=0` don't see libfaketime.
- **JVM bypasses libc for some time calls** (Instant from
  monotonic system clock). Use `mockclock-jvm`.
- **Doesn't fake monotonic clocks** by default; some clock_gettime
  flags pass through.
- **No leap-second simulation.** See
  `leap-second-reference`.

## References

- libfaketime:
  [github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime).
- Companion catalogs:
  `dst-transition-reference`,
  `leap-second-reference`,
  `iso-8601-vs-rfc-3339-reference`.
- Language-native siblings:
  `sinon-fake-timers-js`,
  `jest-fake-timers`,
  `freezegun-python`,
  `timecop-ruby`,
  `mockclock-jvm`.
- Test matrix:
  `timezone-test-matrix-builder`.
