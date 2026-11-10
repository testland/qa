---
description: Short prompt that should load red-green-refactor with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This returns the wrong total when the cart is empty. Can you fix it?

```js
function total(items) { return items.reduce((s, i) => s + i.price); }
```
