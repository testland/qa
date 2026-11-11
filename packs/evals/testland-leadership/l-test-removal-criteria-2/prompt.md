---
description: Short prompt that should load test-removal-criteria with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Should we delete these tests?

```js
it('returns value', () => { expect(getX()).toBe(getX()); });
it('creates user', () => { /* same as test above in users.spec.js */ });
it('old export v1', () => { /* feature removed in 2024 */ });
```
