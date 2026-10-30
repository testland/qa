---
description: Should load reachability-analyzer when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

npm audit reports 140 vulnerabilities in a Node.js project and most seem to be in packages nobody uses. How can the scan focus on the ones that matter?
