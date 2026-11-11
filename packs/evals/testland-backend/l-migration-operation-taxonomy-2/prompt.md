---
description: Short prompt that should load migration-operation-taxonomy with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Is this migration safe to run in production on a 200M-row table?

```sql
ALTER TABLE events ADD COLUMN source text NOT NULL DEFAULT 'web';
CREATE INDEX idx_events_user ON events(user_id);
ALTER TABLE events RENAME COLUMN ts TO created_at;
```
