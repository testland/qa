---
description: Short prompt that should load ci-failure-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this a real failure?

```
FAILED tests/api/test_orders.py::test_refund - requests.exceptions.ConnectionError: HTTPConnectionPool(host='payments-mock', port=8080): Max retries exceeded
(passed on the previous 40 runs; rerun passed)
```
