---
description: Short prompt that should load aws-sam-local-testing with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Invoke this handler locally with an API Gateway event and test it.

```python
def handler(event, context):
    body = json.loads(event['body'])
    return {'statusCode': 200, 'body': json.dumps({'total': body['qty'] * 9.99})}
```
