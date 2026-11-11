---
description: Short prompt that should delegate to the e2e-selector-quality-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review the selectors in this test.

```ts
await page.click('div.container > div:nth-child(3) > button.btn-primary');
await page.fill('//form/div[2]/input', 'ann@x.io');
await page.click('.css-1x2y3z');
```
