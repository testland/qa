---
description: Short prompt that should load websocket-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this WebSocket handler.

```js
wss.on('connection', ws => {
  ws.on('message', m => wss.clients.forEach(c => c.send(m.toString())));
});
```
