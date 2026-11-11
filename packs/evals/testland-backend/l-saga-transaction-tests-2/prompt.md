---
description: Short prompt that should load saga-transaction-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this booking saga when the payment step fails.

```ts
async function bookTrip(t) {
  const flight = await flights.reserve(t);
  const hotel = await hotels.reserve(t);
  await payments.charge(t);   // may throw
}
```
