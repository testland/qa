---
description: Short prompt that should load playwright-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Make this Playwright test less flaky.

```ts
test('add to cart', async ({ page }) => {
  await page.goto('/shop');
  await page.click('.product >> nth=0');
  await page.waitForTimeout(2000);
  expect(await page.textContent('#cart-count')).toBe('1');
});
```
