---
description: Short prompt that should load appium-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Fix this Appium test that fails after upgrading to Appium 3.

```js
const caps = { platformName: 'Android', deviceName: 'Pixel 8', app: './app.apk', automationName: 'UiAutomator2' };
const driver = await remote({ capabilities: caps });
await (await driver.$('~login')).click();
```
