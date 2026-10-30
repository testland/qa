---
description: Should load zap-baseline when the whole pack is installed (random sample).
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test]
---

Add OWASP ZAP to CI: a passive baseline scan on every pull request against the staging URL, failing on high alerts.
