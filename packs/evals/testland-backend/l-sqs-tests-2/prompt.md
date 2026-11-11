---
description: Short prompt that should load sqs-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write tests for this SQS handler, including a poison message.

```python
def poll():
    for m in sqs.receive_message(QueueUrl=URL, MaxNumberOfMessages=10).get('Messages', []):
        process(json.loads(m['Body']))
        sqs.delete_message(QueueUrl=URL, ReceiptHandle=m['ReceiptHandle'])
```
