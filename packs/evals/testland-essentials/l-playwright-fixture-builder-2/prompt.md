---
description: Short prompt that should load playwright-fixture-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Turn this repeated setup into a Playwright fixture.

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'qa@app.io');
  await page.fill('#password', process.env.PW!);
  await page.click('text=Sign in');
});
```
