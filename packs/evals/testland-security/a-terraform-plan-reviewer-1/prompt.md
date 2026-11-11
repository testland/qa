---
description: Short prompt that should delegate to the terraform-plan-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this terraform plan for risky changes.

```
# aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" { storage_encrypted = true -> false }
~ resource "aws_security_group_rule" "ssh" { cidr_blocks = ["10.0.0.0/8"] -> ["0.0.0.0/0"] }
```
