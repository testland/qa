---
description: Short prompt that should load pdf-snapshot-tester with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that catches layout changes in this PDF output.

```python
def render_invoice(order) -> bytes:
    return weasyprint.HTML(string=template.render(order=order)).write_pdf()
```
