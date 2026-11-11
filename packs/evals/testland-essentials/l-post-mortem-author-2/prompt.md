---
description: Short prompt that should load post-mortem-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write the post-mortem for this incident: 14:02 deploy of v3.4 started, 14:09 checkout errors jumped to 30%, 14:21 on-call paged, 14:35 rollback, 14:41 errors back to normal. Cause: a missing DB index on orders.created_at.
