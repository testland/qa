---
description: Short prompt that should load deadlock-detection-harness with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Can these two methods deadlock? Write a test that would catch it.

```java
void transfer(Account a, Account b, int amt) {
  synchronized (a) { synchronized (b) { a.debit(amt); b.credit(amt); } }
}
```
