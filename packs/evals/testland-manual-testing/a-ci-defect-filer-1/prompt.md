---
description: Short prompt that should delegate to the ci-defect-filer agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

File a bug in Jira for this CI failure without creating a duplicate.

```xml
<testcase name="test_refund_partial" classname="api.refunds"><failure message="AssertionError: 500 != 200">...</failure></testcase>
```
