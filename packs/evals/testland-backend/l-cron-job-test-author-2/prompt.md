---
description: Short prompt that should load cron-job-test-author with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this scheduled job.

```python
# runs '0 2 * * *' in Europe/Berlin
def nightly_billing():
    for acct in accounts_due(today()):
        charge(acct)
```
