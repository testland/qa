---
description: Short prompt that should delegate to the prompt-eval-reviewer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review our promptfoo eval suite.

```yaml
providers: [openai:gpt-4.1]
tests:
  - vars: { q: 'refund policy?' }
    assert: [{ type: equals, value: 'Refunds within 30 days.' }]
  - vars: { q: 'shipping time?' }
    assert: [{ type: contains, value: 'days' }]
```
