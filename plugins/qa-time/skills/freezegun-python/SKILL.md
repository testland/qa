---
name: freezegun-python
description: "Wraps freezegun (github.com/spulec/freezegun), the Python time-mocking library: @freeze_time decorator / context manager, freeze_time(...).start() + stop(), tick / move_to / tz_offset, and integration with datetime.now / time.time / time.localtime. Use when testing Python code that calls datetime / time."
---

# freezegun-python

## Overview

freezegun patches `datetime.datetime`, `datetime.date`,
`time.time`, `time.gmtime`, `time.localtime`, `time.strftime`,
and `asyncio` time across the test scope. Per
[github.com/spulec/freezegun](https://github.com/spulec/freezegun).

## When to use

- pytest / unittest tests for Python code using datetime / time.
- Date-based fixtures (e.g., "today is 2026-05-20").
- DST + timezone tests per
  `dst-transition-reference`.

## Authoring

### Install

```bash
pip install freezegun
```

### Decorator (most common)

```python
from freezegun import freeze_time
from datetime import datetime

@freeze_time("2026-05-20T14:30:00")
def test_today_is_may_20():
    assert datetime.now().strftime("%Y-%m-%d") == "2026-05-20"
```

### Context manager

```python
with freeze_time("2026-05-20T14:30:00"):
    assert datetime.now().strftime("%Y-%m-%d") == "2026-05-20"
```

### Manual start/stop

```python
freezer = freeze_time("2026-05-20T14:30:00")
freezer.start()
try:
    # ...
finally:
    freezer.stop()
```

### Tick mode

```python
@freeze_time("2026-05-20T14:30:00", tick=True)
def test_clock_advances():
    t1 = datetime.now()
    # ... a few ops later
    t2 = datetime.now()
    assert t2 > t1
```

`tick=True` lets real time pass from the frozen start point.
Useful for tests that need duration measurement.

### Move to a different time mid-test

```python
@freeze_time("2026-05-20T14:30:00")
def test_advance_one_day(freezer):
    assert datetime.now().day == 20
    freezer.move_to("2026-05-21T14:30:00")
    assert datetime.now().day == 21
```

Or via `freezer.tick(delta=timedelta(hours=24))`.

### Timezone offset

```python
@freeze_time("2026-05-20T14:30:00", tz_offset=-5)
def test_eastern_time():
    # datetime.now() returns wall-clock; datetime.utcnow() returns UTC
    assert datetime.utcnow().hour == 19  # 14:30 + 5
    assert datetime.now().hour == 14
```

### DST, async, and CI

DST + zone tests, async support, and CI integration are in
[references/advanced-scenarios.md](references/advanced-scenarios.md).

## Running

```bash
pytest tests/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `freeze_time("2026-05-20")` (date only) | freezegun interprets as midnight local; subtle | Use ISO datetime |
| `time.sleep(...)` inside frozen-time block | Sleep is real-time; frozen clock doesn't advance | Use `freezer.tick()` |
| Mock `datetime.utcnow` separately | Conflicts with freezegun | Let freezegun do both |
| Forget freezer cleanup in fixtures | Cross-test contamination | Use decorator or `with` |
| Test DST without `tz_offset` or zoneinfo | Result is UTC; misses local behaviour | Combine with zoneinfo |
| `@freeze_time` on a class without `decorate_class=True` | Methods not patched | Use class decorator explicitly |
| Test third-party C extensions calling system time | freezegun only patches Python-level APIs | Use libfaketime |

## Limitations

- **C extensions bypass freezegun.** A library calling
  `clock_gettime()` from C sees the real clock. Use
  `libfaketime-c` for those.
- **No leap-second simulation.** See
  `leap-second-reference`.
- **`tz_offset` doesn't know about DST.** For accurate local-zone
  behaviour, use `datetime.now(tz=zoneinfo.ZoneInfo("..."))`.
- **Importing `datetime` before freezing.** If a module imports
  `datetime.now` directly at module-load, the unfrozen value may
  be cached.

## References

- freezegun:
  [github.com/spulec/freezegun](https://github.com/spulec/freezegun).
- Python zoneinfo:
  [docs.python.org/3/library/zoneinfo.html](https://docs.python.org/3/library/zoneinfo.html).
- Companion catalogs:
  `dst-transition-reference`,
  `leap-second-reference`,
  `iso-8601-vs-rfc-3339-reference`.
- Cross-language:
  `libfaketime-c`,
  `sinon-fake-timers-js`,
  `jest-fake-timers`,
  `timecop-ruby`,
  `mockclock-jvm`.
- Test matrix:
  `timezone-test-matrix-builder`.
