---
description: Short prompt that should delegate to the playwright-codegen-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Clean up this recorded Playwright test.

```ts
await page.goto('https://shop.io/');
await page.locator('#root > div > header > div:nth-child(2) > button').click();
await page.locator('input[name="q"]').click();
await page.locator('input[name="q"]').fill('mug');
await page.waitForTimeout(2000);
await page.locator('.product-card >> nth=0').click();
```
