---
description: Short prompt that should load fake-clock-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Test this function without waiting for real time to pass.

```ts
export function isExpired(token: { issuedAt: number }) {
  return Date.now() - token.issuedAt > 15 * 60 * 1000;
}
```
