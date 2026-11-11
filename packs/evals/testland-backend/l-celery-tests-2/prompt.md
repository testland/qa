---
description: Short prompt that should load celery-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Test that this Celery task retries on a timeout.

```python
@app.task(bind=True, max_retries=3)
def sync_invoice(self, invoice_id):
    try:
        erp.push(invoice_id)
    except TimeoutError as exc:
        raise self.retry(exc=exc, countdown=30)
```
