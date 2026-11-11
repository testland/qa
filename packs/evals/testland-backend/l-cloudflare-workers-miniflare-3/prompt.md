---
description: Short prompt that should load cloudflare-workers-miniflare with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Our Durable Object code only gets tested after we deploy to Cloudflare. How do we test it in CI?
