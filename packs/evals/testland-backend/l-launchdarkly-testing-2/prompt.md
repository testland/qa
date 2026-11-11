---
description: Short prompt that should load launchdarkly-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for both flag values here without calling LaunchDarkly.

```js
const showNewNav = await ldClient.variation('new-nav', context, false);
return showNewNav ? renderNewNav() : renderOldNav();
```
