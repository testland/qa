---
description: Short prompt that should load regression-suite-selector with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our regression suite takes 2 hours. Build a CI step that picks the tests affected by this PR's changed files.

```
changed: src/billing/invoice.ts, src/billing/tax.ts
```
