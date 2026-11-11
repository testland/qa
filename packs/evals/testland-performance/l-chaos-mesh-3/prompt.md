---
description: Short prompt that should load chaos-mesh with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We want to test what happens when DNS fails inside our Kubernetes cluster. How?
