---
description: Short prompt that should load fast-check-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a property test that checks `decode(encode(x))` returns `x` for this JS codec.

```js
export const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
export const decode = (s) => JSON.parse(Buffer.from(s, 'base64').toString());
```
