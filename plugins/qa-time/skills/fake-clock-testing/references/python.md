# Python - freezegun

freezegun patches `datetime.datetime`, `datetime.date`, `time.time`,
`time.gmtime`, `time.localtime`, `time.strftime`, and `asyncio` time across
the test scope. Per [github.com/spulec/freezegun](https://github.com/spulec/freezegun).

## Install

```bash
pip install freezegun
```

## Decorator (most common)

```python
from freezegun import freeze_time
from datetime import datetime

@freeze_time("2026-05-20T14:30:00")
def test_today_is_may_20():
    assert datetime.now().strftime("%Y-%m-%d") == "2026-05-20"
```

## Context manager and manual start/stop

```python
with freeze_time("2026-05-20T14:30:00"):
    assert datetime.now().strftime("%Y-%m-%d") == "2026-05-20"

freezer = freeze_time("2026-05-20T14:30:00")
freezer.start()
try:
    ...
finally:
    freezer.stop()
```

## Tick mode and moving mid-test

```python
@freeze_time("2026-05-20T14:30:00", tick=True)   # real time passes from the frozen start
def test_clock_advances():
    t1 = datetime.now()
    t2 = datetime.now()
    assert t2 > t1

@freeze_time("2026-05-20T14:30:00")
def test_advance_one_day(freezer):
    freezer.move_to("2026-05-21T14:30:00")       # or freezer.tick(delta=timedelta(hours=24))
    assert datetime.now().day == 21
```

## Timezone offset

```python
@freeze_time("2026-05-20T14:30:00", tz_offset=-5)
def test_eastern_time():
    assert datetime.utcnow().hour == 19   # 14:30 + 5
    assert datetime.now().hour == 14      # wall clock
```

`tz_offset` is a fixed offset and does not know about DST. For local-zone
behaviour at a transition, freeze UTC and read through `zoneinfo`:

```python
from zoneinfo import ZoneInfo

@freeze_time("2026-03-08T07:30:00")   # 02:30 EST or 03:30 EDT depending on resolution
def test_spring_forward_handling():
    ny = datetime.now(ZoneInfo("America/New_York"))
    # assert against the documented library behaviour per dst-transition-reference
```

## Async support

```python
@freeze_time("2026-05-20T14:30:00")
async def test_async_now():
    await asyncio.sleep(0)
    assert datetime.now().strftime("%Y") == "2026"
```

Per freezegun docs: "freezegun is compatible with asyncio."

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
| `freeze_time("2026-05-20")` (date only) | Interpreted as midnight local; subtle | Use a full ISO datetime |
| `time.sleep(...)` inside a frozen block | Sleep is real-time; frozen clock doesn't advance | Use `freezer.tick()` |
| Mock `datetime.utcnow` separately | Conflicts with freezegun | Let freezegun patch both |
| Forget freezer cleanup in fixtures | Cross-test contamination | Use decorator or `with` |
| DST test without `tz_offset` or zoneinfo | Result is UTC; misses local behaviour | Combine with `zoneinfo` |
| `@freeze_time` on a class without `decorate_class=True` | Methods not patched | Use the class decorator explicitly |

## Limitations

- **C extensions bypass freezegun** - a library calling `clock_gettime()`
  from C sees the real clock. Use libfaketime
  ([libfaketime.md](libfaketime.md)).
- **`tz_offset` doesn't know about DST** - use
  `datetime.now(tz=zoneinfo.ZoneInfo(...))` for accurate local-zone tests.
- **Module-level `from datetime import datetime` at import time** can cache
  the unfrozen callable before the patch lands.

## References

- freezegun: [github.com/spulec/freezegun](https://github.com/spulec/freezegun)
- Python zoneinfo: [docs.python.org/3/library/zoneinfo.html](https://docs.python.org/3/library/zoneinfo.html)
