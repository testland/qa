---
description: Short prompt that should load bullmq-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this BullMQ worker, including the retry behavior.

```ts
new Worker('emails', async job => {
  await mailer.send(job.data.to, job.data.template);
}, { connection, attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
```
