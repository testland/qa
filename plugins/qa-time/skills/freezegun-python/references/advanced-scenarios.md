# freezegun advanced scenarios

DST/zone tests, async support, and CI wiring extracted from the
core skill. Core decorator/context-manager/tick usage stays in
SKILL.md.

## DST + zone tests

`tz_offset` is a fixed offset and does not know about DST. For
local-zone behaviour at a transition, freeze UTC and read through
`zoneinfo`.

```python
import pytest
from zoneinfo import ZoneInfo
from freezegun import freeze_time
from datetime import datetime

@freeze_time("2026-03-08T07:30:00")  # 02:30 EST OR 03:30 EDT - depends on resolution
def test_spring_forward_handling():
    ny = datetime.now(ZoneInfo("America/New_York"))
    # Asserts against expected library behaviour per dst-transition-reference
```

## Async support

```python
from freezegun import freeze_time
from datetime import datetime
import asyncio

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
