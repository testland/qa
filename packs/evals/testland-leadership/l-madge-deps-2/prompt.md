---
description: Short prompt that should load madge-deps with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

This import is undefined at runtime even though it compiles. Why?

```ts
// a.ts
import { b } from './b';
export const a = () => b();
// b.ts
import { a } from './a';
export const b = () => 1;
export const c = a;
```
