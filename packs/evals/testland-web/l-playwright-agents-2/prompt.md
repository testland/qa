---
description: Short prompt that should load playwright-agents with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

The Playwright healer agent opened this diff on a failing test. Should I merge it?

```diff
- await page.getByRole('button', { name: 'Pay now' }).click();
+ await page.locator('div:nth-child(3) > button').click();
```
