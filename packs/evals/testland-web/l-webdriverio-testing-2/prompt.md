---
description: Short prompt that should load webdriverio-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Convert this to a WebdriverIO test.

```js
const driver = await new Builder().forBrowser('chrome').build();
await driver.get('https://example.com');
await driver.findElement(By.css('#search')).sendKeys('shoes');
```
