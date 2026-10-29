---
description: Should load python-unit-tests when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Write pytest unit tests for this function, including edge cases:

```python
def parse_price(text: str) -> int:
    """'$12.50' -> 1250 cents; raises ValueError on bad input."""
    text = text.strip().lstrip('$')
    dollars, _, cents = text.partition('.')
    return int(dollars) * 100 + int((cents + '00')[:2])
```
