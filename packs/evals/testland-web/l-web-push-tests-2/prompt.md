---
description: Short prompt that should load web-push-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this push subscription code.

```js
const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC });
await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(sub) });
```
