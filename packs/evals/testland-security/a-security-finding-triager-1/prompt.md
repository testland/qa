---
description: Short prompt that should delegate to the security-finding-triager agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Combine these scanner results into one gate decision for this PR: Semgrep 2 high, Trivy 1 critical in the base image, Gitleaks 1 secret in config.py, ZAP 4 low, Snyk 3 medium.
