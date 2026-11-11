---
description: Short prompt that should load cache-key-discriminator-audit with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this cache key safe?

```js
const key = `dashboard:${req.params.reportId}`;
const cached = await redis.get(key);
if (cached) return res.json(JSON.parse(cached));
```
