# libfaketime - the LD_PRELOAD escape hatch

Per [github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime),
libfaketime returns a value derived from the `FAKETIME` environment variable
instead of the real clock by intercepting libc `time()` / `gettimeofday()` /
`clock_gettime()`. Because it hooks libc, it works for **any dynamically
linked binary** - C/C++, Go (cgo builds), Rust, Python - including processes
you don't control the source of. Reach for it when language-native fakes
cannot patch the code (C extensions, closed-source binaries, multi-process
integration tests).

## Install

```bash
sudo apt install faketime        # Debian/Ubuntu
brew install libfaketime         # macOS
# or from source: git clone https://github.com/wolfcw/libfaketime && make && sudo make install
```

## Absolute-date mode

```bash
faketime '2026-12-31 23:59:00' your_command
# equivalent raw form:
LD_PRELOAD=/usr/local/lib/faketime/libfaketime.so.1 \
  FAKETIME='2026-12-31 23:59:00' your_command
```

## Relative offset and advance-rate modes

```bash
faketime '-1d' your_command                       # 1 day in the past
faketime '+2h30m' your_command                    # 2h30m ahead
faketime -f '@2026-12-31 23:59:00 x10' your_cmd   # start there, run at 10x speed
```

The `x<rate>` spec suits scheduler/cron simulations - e.g.
`faketime -f '@2026-01-01 00:00:00 x5256' ./cron-runner` simulates a year
in ~10 minutes.

## High-resolution mode

```bash
FAKETIME_NO_CACHE=1 faketime '2026-12-31 23:59:00' your_command
```

Disables libfaketime's per-second caching so code reading time hundreds of
times per second sees consistent values.

## Asserting from a test runner

libfaketime emits nothing itself - assert on the wrapped program's visible
behaviour:

```python
import subprocess

def test_cron_fires_at_midnight():
    result = subprocess.run(
        ["faketime", "2026-12-31 23:59:30", "./cron-runner"],
        capture_output=True, text=True, timeout=5,
    )
    assert "Fired at 2027-01-01 00:00:00" in result.stdout
```

## DST recipe - non-existent local time

```bash
TZ='America/New_York' faketime '2026-03-08 02:30:00' ./my-program
```

US Eastern springs forward at 02:00 on 2026-03-08, so 02:30 local does not
exist; `TZ` makes the program resolve the faked instant in Eastern. Assert
the program skips the job or normalises to 03:30, per
`dst-transition-reference`.

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
| Statically linked binaries | LD_PRELOAD has no symbols to intercept | Language-native fake clock |
| Raw `LD_PRELOAD` with a wrong path | Silently no-ops | Use the `faketime` wrapper |
| Spring-forward test without `TZ` | Fake time resolves in UTC only | Prefix `TZ='<zone>'` |
| Missing `FAKETIME_NO_CACHE=1` for fast-polling code | Time stalls between cache refreshes | Set it explicitly |
| Using it against the JVM | Some JVM time calls bypass libc | Clock injection ([jvm.md](jvm.md)) |

## Limitations

- **Linux + macOS only** - Windows uses different time syscalls.
- **Static binaries unaffected** - Go compiled with `CGO_ENABLED=0` does
  not see libfaketime.
- **Monotonic clocks are not faked by default**; some `clock_gettime`
  flags pass through.

## References

- libfaketime: [github.com/wolfcw/libfaketime](https://github.com/wolfcw/libfaketime)
