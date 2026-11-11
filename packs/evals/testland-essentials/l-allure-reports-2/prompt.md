---
description: Short prompt that should load allure-reports with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add Allure reporting with steps and screenshots to this test.

```python
def test_checkout(page):
    page.goto('/cart')
    page.click('text=Checkout')
    assert page.is_visible('text=Order placed')
```
