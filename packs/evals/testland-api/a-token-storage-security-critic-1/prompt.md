---
description: Short prompt that should delegate to the token-storage-security-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this code for token storage problems.

```js
localStorage.setItem('access_token', res.data.token);
res.cookie('session', sid);
console.log('login ok', { user, token });
```
