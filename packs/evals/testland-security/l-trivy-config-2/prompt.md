---
description: Short prompt that should load trivy-config with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

We're replacing tfsec. Set up trivy config for this repo.

```yaml
- uses: aquasecurity/tfsec-action@v1.0.0
  with: { working_directory: infra/ }
```
