---
description: Short prompt that should load pact-contract-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Pact consumer test for this client.

```ts
export const getOrder = (id: string) => fetch(`${BASE}/orders/${id}`).then(r => r.json());
```
