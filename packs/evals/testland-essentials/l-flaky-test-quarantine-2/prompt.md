---
description: Short prompt that should load flaky-test-quarantine with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Quarantine this flaky test properly so it doesn't block merges but isn't forgotten.

```ts
test('uploads avatar', async ({ page }) => {
  await page.setInputFiles('#avatar', 'fixtures/me.png');
  await expect(page.getByAltText('avatar')).toBeVisible();
});
```
