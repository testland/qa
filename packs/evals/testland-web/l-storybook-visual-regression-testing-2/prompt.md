---
description: Short prompt that should load storybook-visual-regression-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add screenshot tests to this Storybook test-runner config.

```js
// .storybook/test-runner.js
module.exports = {
  async postVisit(page, context) {}
};
```
