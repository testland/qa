---
description: Short prompt that should delegate to the flag-coverage-gap-detector agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Find feature-flag branches with no tests.

```ts
if (await flags.getBooleanValue('new-pricing', false)) { return newPrice(cart); }
const variant = ld.variation('checkout-layout', ctx, 'control');
if (variant === 'b') renderB(); else if (variant === 'c') renderC();
```
