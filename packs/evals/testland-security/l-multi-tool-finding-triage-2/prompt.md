---
description: Short prompt that should load multi-tool-finding-triage with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We got these reports for one PR. Should it merge?

- Semgrep: 2 high (sql-injection in orders.py:44, hardcoded-secret in config.py:3)
- Trivy: 1 critical CVE in base image
- Gitleaks: 1 finding in config.py:3
- ZAP: 4 low
