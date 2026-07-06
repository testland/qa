---
name: freezegun-python
description: "Wraps freezegun (github.com/spulec/freezegun), the Python time-mocking library: @freeze_time decorator / context manager, freeze_time(...).start() + stop(), tick / move_to / tz_offset, and integration with datetime.now / time.time / time.localtime. Use when testing Python code that calls datetime / time. Composes dst-transition-reference + iso-8601-vs-rfc-3339-reference."
---

# freezegun-python

## Overview

`freezegun` is the canonical Python time-mocking library. Per
[github.com/spulec/freezegun](https://github.com/spulec/freezegun),
it patches `datetime.datetime`, `datetime.date`, `time.time`,
`time.gmtime`, `time.localtime`, `time.strftime`, plus
`asyncio` time across the test scope.

## When to use

- pytest / unittest tests for Python code using datetime / time.
- Date-based fixtures (e.g., "today is 2026-05-20").
- DST + timezone tests per
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md).

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

### DST + zone tests

```python
import pytest
from zoneinfo import ZoneInfo

@freeze_time("2026-03-08T07:30:00")  # 02:30 EST OR 03:30 EDT — depends on resolution
def test_spring_forward_handling():
    ny = datetime.now(ZoneInfo("America/New_York"))
    # Asserts against expected library behaviour per dst-transition-reference
```

### Async support

```python
@freeze_time("2026-05-20T14:30:00")
async def test_async_now():
    await asyncio.sleep(0)
    assert datetime.now().strftime("%Y") == "2026"
```

Per freezegun docs: "freezegun is compatible with asyncio."

## Running

```bash
pytest tests/
```

## CI integration

```yaml
jobs:
  python-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
      - run: pip install -e ".[test]" freezegun
      - run: pytest tests/
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
  [`libfaketime-c`](../libfaketime-c/SKILL.md) for those.
- **No leap-second simulation.** See
  [`leap-second-reference`](../leap-second-reference/SKILL.md).
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
  [`dst-transition-reference`](../dst-transition-reference/SKILL.md),
  [`leap-second-reference`](../leap-second-reference/SKILL.md),
  [`iso-8601-vs-rfc-3339-reference`](../iso-8601-vs-rfc-3339-reference/SKILL.md).
- Cross-language:
  [`libfaketime-c`](../libfaketime-c/SKILL.md),
  [`sinon-fake-timers-js`](../sinon-fake-timers-js/SKILL.md),
  [`jest-fake-timers`](../jest-fake-timers/SKILL.md),
  [`timecop-ruby`](../timecop-ruby/SKILL.md),
  [`mockclock-jvm`](../mockclock-jvm/SKILL.md).
- Test matrix:
  [`timezone-test-matrix-builder`](../timezone-test-matrix-builder/SKILL.md).
