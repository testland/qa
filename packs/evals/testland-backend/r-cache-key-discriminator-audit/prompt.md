---
description: Should load cache-key-discriminator-audit when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

A user reported seeing another customer's account page. The API responses go through a shared Redis cache and a CDN. Check whether the cache keys are the cause and what tests should prevent it.
