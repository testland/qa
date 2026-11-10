---
description: Short prompt that should load protobuf-compat-checking with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this proto change safe?

```diff
 message Order {
   string id = 1;
-  int32 total_cents = 2;
+  int64 total_cents = 2;
 }
```
