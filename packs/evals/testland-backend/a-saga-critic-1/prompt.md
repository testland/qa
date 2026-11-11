---
description: Short prompt that should delegate to the saga-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this saga for missing compensations.

```ts
async function placeOrder(o) {
  await inventory.reserve(o);
  await payments.charge(o);
  await shipping.book(o);
  await bus.publish('OrderPlaced', o);
}
```
