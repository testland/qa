---
description: Short prompt that should load timezone-test-matrix-builder with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our app stores and displays times like this. Build the time zone test cases we need.

```js
const due = new Date(invoice.dueDate);          // stored as 'YYYY-MM-DD'
return due.toLocaleDateString(user.locale);
```
