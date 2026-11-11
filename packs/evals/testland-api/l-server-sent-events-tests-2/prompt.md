---
description: Short prompt that should load server-sent-events-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this SSE endpoint.

```js
app.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream' });
  bus.on('order', o => res.write(`id: ${o.seq}\ndata: ${JSON.stringify(o)}\n\n`));
});
```
