---
description: Short prompt that should delegate to the serverless-cold-start-critic agent with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Task]
tags: [load-test, agent]
---

Review this Lambda for cold-start problems.

```python
def handler(event, context):
    import pandas as pd
    client = boto3.client('dynamodb')
    db = psycopg2.connect(os.environ['DSN'])
    return process(event, client, db)
```
