---
description: Short prompt that should delegate to the realtime-protocol-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this WebSocket client for reliability problems.

```js
const ws = new WebSocket(URL);
ws.onclose = () => { new WebSocket(URL); };
ws.onmessage = e => render(JSON.parse(e.data));
```
