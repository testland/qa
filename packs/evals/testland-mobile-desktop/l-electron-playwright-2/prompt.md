---
description: Short prompt that should load electron-playwright with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Migrate this Spectron test to Playwright.

```js
const app = new Application({ path: electronPath, args: ['.'] });
await app.start();
const title = await app.client.getTitle();
assert.equal(title, 'Notes');
```
