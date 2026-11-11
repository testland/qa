---
description: Short prompt that should load auth0-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test for this Auth0 Action.

```js
exports.onExecutePostLogin = async (event, api) => {
  if (!event.user.email_verified) api.access.deny('Please verify your email');
};
```
