---
description: Short prompt that should load checkov-policy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Run Checkov on this Terraform in CI and fail only on new findings.

```hcl
resource "aws_s3_bucket" "logs" { bucket = "acme-logs" }
resource "aws_security_group" "db" {
  ingress { from_port = 5432 to_port = 5432 cidr_blocks = ["0.0.0.0/0"] }
}
```
