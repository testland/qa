---
description: Short prompt that should load presidio-pii-detection with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Redact the personal data in these log lines.

```
2026-11-10 user=anna.mueller@web.de ip=84.12.3.4 action=checkout card=4111111111111111
2026-11-10 support note: call Jan back on +49 151 2345678 about IBAN DE89370400440532013000
```
