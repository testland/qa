---
description: Short prompt that should delegate to the property-based-test-author agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Write a property-based test for this invariant: sorting a list twice gives the same result as sorting it once.

```ts
export function sortUsers(u: User[]): User[] { return [...u].sort((a, b) => a.name.localeCompare(b.name)); }
```
