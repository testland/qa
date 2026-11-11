---
description: Short prompt that should load smoke-suite-gate with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Turn these into a post-deploy smoke gate that runs in under 5 minutes: login, search, add to cart, checkout with test card, view order history, change password, export invoice.
