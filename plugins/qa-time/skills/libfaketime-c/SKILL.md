---
name: libfaketime-c
description: "Wraps libfaketime (github.com/wolfcw/libfaketime), the LD_PRELOAD library that fakes the clock for any binary by intercepting time() / gettimeofday() / clock_gettime(). Covers absolute-date mode (FAKETIME='2026-12-31 23:59:00'), relative offset (FAKETIME='-1d'), advance-rate (FAKETIME='@2026-12-31 23:59:00 x5' for 5x speed), per-process scope via LD_PRELOAD, and FAKETIME_NO_CACHE for high-resolution mocking. Use when you need to fake time, mock the clock, or freeze time for C/C++ or any native binary that needs deterministic wall-clock time."
---

# libfaketime-c

## Overview

Per
[github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime),
`libfaketime` returns a value derived from the `FAKETIME` environment
variable instead of the real clock. Because it hooks libc, it works for
**any dynamically-linked binary** - Go, Rust, Python, not just C/C++.

## When to use

- Testing C/C++ code that uses libc time.
- Testing any process where you don't control the source.
- Integration tests where one process's perceived clock matters.
- CI tests for time-sensitive logic without overriding system
  clock.

## How to use

1. Install `faketime` on the test host (apt / brew / from source).
2. Pick a mode: absolute date, relative offset (`-1d`, `+1y`), or
   advance-rate (`@... x<rate>`).
3. Wrap the target binary: `faketime '<spec>' your_command`, or set
   `LD_PRELOAD` plus `FAKETIME` directly.
4. Prefix `TZ='<zone>'` when the behaviour depends on a local zone,
   for example DST transitions.
5. Set `FAKETIME_NO_CACHE=1` when the code reads time many times per
   second.
6. Assert on the program's visible output or behaviour from your test
   runner (libfaketime emits nothing itself).
7. Install `faketime` in CI before running the time-sensitive suite.

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

Relative offset (`-1d`, `+1y`), advance-rate (`-f '@... x<rate>'` for time
speed-up), high-resolution mode (`FAKETIME_NO_CACHE=1`), and the
spring-forward / cron time-skip / timezone recipes are in
[references/faketime-modes-and-recipes.md](references/faketime-modes-and-recipes.md).

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

## Worked example

Verify a scheduler's behaviour at the non-existent local time 02:30
on a spring-forward day, without changing the host clock:

1. Pick the transition: US Eastern springs forward at 02:00 on
   2026-03-08, so 02:30 local does not exist that day.
2. Run with both the zone and the fake instant:
   `TZ='America/New_York' faketime '2026-03-08 02:30:00' ./my-program`.
3. libfaketime returns that wall-clock instant from libc, and `TZ`
   makes the program resolve it in Eastern.
4. Assert the program either skips the job or normalises to 03:30
   (whichever the spec requires), matching `dst-transition-reference`.

Result: the spring-forward branch runs deterministically on every CI
run, with no dependence on the real date or the host clock.

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
