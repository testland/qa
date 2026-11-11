---
description: Short prompt that should delegate to the cache-key-collision-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Scan this code for cache keys that could leak data between tenants.

```js
const key = `report:${reportId}`;
const userKey = `prefs:${req.query.locale}`;
await redis.set(key, JSON.stringify(data), 'EX', 300);
```
