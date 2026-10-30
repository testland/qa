---
description: Should load playwright-testing when the whole pack is installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

This Playwright test fails about one run in five on CI. Rewrite it so it is reliable:

```ts
test('adds to cart', async ({ page }) => {
  await page.goto('/product/42');
  await page.click('.btn-primary');
  await page.waitForTimeout(2000);
  expect(await page.textContent('#cart-count')).toBe('1');
});
```
