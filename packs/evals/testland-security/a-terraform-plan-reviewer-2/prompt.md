---
description: Short prompt that should delegate to the terraform-plan-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Check this Terraform plan JSON for deletions, IAM broadening and public exposure before we apply it.
