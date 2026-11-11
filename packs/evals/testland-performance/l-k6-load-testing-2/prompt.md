---
description: Short prompt that should load k6-load-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add thresholds so this k6 test fails CI when p95 latency is over 500 ms or errors exceed 1%.

```js
import http from 'k6/http';
export const options = { vus: 50, duration: '5m' };
export default function () { http.get('https://staging.shop.io/api/products'); }
```
