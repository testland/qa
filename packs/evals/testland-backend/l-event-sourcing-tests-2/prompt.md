---
description: Short prompt that should load event-sourcing-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write given/when/then tests for this aggregate.

```ts
class Account {
  apply(e: Event) { if (e.type === 'Deposited') this.balance += e.amount; if (e.type === 'Withdrawn') this.balance -= e.amount; }
  withdraw(amount: number) { if (amount > this.balance) throw new Error('insufficient'); return [{ type: 'Withdrawn', amount }]; }
}
```
