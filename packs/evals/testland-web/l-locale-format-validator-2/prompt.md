---
description: Short prompt that should load locale-format-validator with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this formatter across en-US, de-DE and ja-JP.

```ts
export const price = (n: number, locale: string, cur: string) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(n);
```
