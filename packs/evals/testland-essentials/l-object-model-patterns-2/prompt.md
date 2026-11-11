---
description: Short prompt that should load object-model-patterns with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Refactor this test to a better object model.

```ts
await page.fill('#email', 'a@b.io');
await page.fill('#password', 'pw');
await page.click('button[type=submit]');
await page.click('.nav >> text=Settings');
await page.click('#save');
```
