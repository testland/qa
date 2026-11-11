---
description: Short prompt that should load negative-test-generator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This test only checks the happy path. Add the negative cases.

```python
def test_create_order(client):
    r = client.post('/orders', json={'sku': 'A1', 'qty': 2})
    assert r.status_code == 201
```
