---
description: Short prompt that should load openfeature-sdk-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this flag check using an in-memory provider.

```ts
const client = OpenFeature.getClient();
const enabled = await client.getBooleanValue('bulk-export', false, { targetingKey: user.id });
```
