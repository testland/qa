---
description: Short prompt that should load flame-graph-analyzer with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Here's the top of our py-spy profile after the slow release. What's the hot path?

```
62% handle_request
  48% serialize_response
    45% json.dumps
      41% default_encoder -> Decimal.__str__
  9% db.fetch
```
