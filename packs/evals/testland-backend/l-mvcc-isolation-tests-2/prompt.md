---
description: Short prompt that should load mvcc-isolation-tests with the whole pack installed.
runs: 1
max_turns: 4
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
tags: [load-test, short-prompt]
---

Write a test that two concurrent bookings can't take the same seat.

```sql
BEGIN;
SELECT count(*) FROM bookings WHERE seat = 'A1';
-- if 0:
INSERT INTO bookings (seat, user_id) VALUES ('A1', $1);
COMMIT;
```
