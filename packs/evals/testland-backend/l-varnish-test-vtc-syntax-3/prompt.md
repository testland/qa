---
description: Short prompt that should load varnish-test-vtc-syntax with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We changed our VCL and now logged-in users get cached pages. How do we test VCL changes before deploying?
