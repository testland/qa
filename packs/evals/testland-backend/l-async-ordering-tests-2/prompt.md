---
description: Short prompt that should load async-ordering-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

What order does this log in, and how do I write a test that pins it down?

```js
setTimeout(() => log('timeout'), 0);
Promise.resolve().then(() => log('promise'));
queueMicrotask(() => log('micro'));
log('sync');
```
