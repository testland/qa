---
description: Short prompt that should load azure-functions-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a unit test for this queue-triggered function.

```js
app.storageQueue('resize', {
  queueName: 'images',
  connection: 'AzureWebJobsStorage',
  handler: async (msg, ctx) => { await resize(msg.blobUrl); },
});
```
