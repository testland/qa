---
description: Short prompt that should load golden-file-conventions with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This snapshot fails on every run. Make it stable.

```js
test('invoice', () => {
  expect(renderInvoice(order)).toMatchSnapshot();
});
// diff: - generatedAt: 2026-11-10T09:12:44Z  + generatedAt: 2026-11-11T08:01:02Z
```
