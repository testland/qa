---
description: Should load red-green-refactor when the whole pack is installed (bug fix that never says TDD).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Users report that this function returns 2.67 for an invoice line of 2.675 instead of 2.68. Fix it and make sure it stays fixed.

```python
def line_total(price: float, qty: int) -> float:
    return round(price * qty, 2)
```
