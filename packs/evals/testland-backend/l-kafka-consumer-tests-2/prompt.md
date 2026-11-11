---
description: Short prompt that should load kafka-consumer-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Test this consumer, including what happens when processing fails.

```ts
await consumer.run({
  eachMessage: async ({ message }) => {
    await orders.upsert(JSON.parse(message.value!.toString()));
  },
});
```
