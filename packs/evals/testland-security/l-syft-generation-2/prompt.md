---
description: Short prompt that should load syft-generation with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Add SBOM generation and vulnerability scanning to this release job.

```yaml
- run: docker build -t ghcr.io/acme/api:${{ github.sha }} .
- run: docker push ghcr.io/acme/api:${{ github.sha }}
```
