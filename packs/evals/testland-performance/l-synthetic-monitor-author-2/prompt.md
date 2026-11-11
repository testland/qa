---
description: Short prompt that should load synthetic-monitor-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a Checkly browser check for this journey: open the store, search 'mug', add to cart, go to checkout and see the payment form. Run every 5 minutes.
