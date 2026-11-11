---
description: Short prompt that should load test-design-scorecard with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Score these tests for a new team member and give coaching feedback, not a merge verdict.

```js
it('works', async () => {
  const r = await api.get('/users');
  expect(r).toBeTruthy();
});
it('works 2', async () => {
  const r = await api.get('/users/1');
  expect(r.status).toBe(200);
});
```
