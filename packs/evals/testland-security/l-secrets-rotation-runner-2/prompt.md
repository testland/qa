---
description: Short prompt that should load secrets-rotation-runner with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We just found this in a public commit from yesterday. What now?

```
STRIPE_SECRET_KEY=sk_live_REDACTED_EXAMPLE
AWS_ACCESS_KEY_ID=AKIAEXAMPLEEXAMPLE
```
