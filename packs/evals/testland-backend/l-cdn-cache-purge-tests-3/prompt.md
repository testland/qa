---
description: Short prompt that should load cdn-cache-purge-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

After we update a product price, some users still see the old price for an hour. How do we test our cache invalidation?
