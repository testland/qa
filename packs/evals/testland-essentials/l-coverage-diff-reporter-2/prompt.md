---
description: Short prompt that should load coverage-diff-reporter with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Compare these two coverage summaries and write the PR comment.

main: src/cart.ts 92%, src/pay.ts 81%, src/user.ts 77%
PR: src/cart.ts 88%, src/pay.ts 85%, src/user.ts 77%, src/coupon.ts 40% (new)
