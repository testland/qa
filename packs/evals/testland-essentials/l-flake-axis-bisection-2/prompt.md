---
description: Short prompt that should load flake-axis-bisection with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This Playwright test fails about 1 run in 8 and I can't see why from the code. Plan how to find the cause.

```ts
test('dashboard totals', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByTestId('total')).toHaveText('$1,200');
});
```
