# INC-4471 — routing pipeline stalled 9h after PR #1180

**Window:** 2026-09-08 09:12 to 18:05 UTC. 2,140 tickets unrouted.

**Cause:** `/summarise-ticket` began returning its JSON object wrapped in a
markdown code fence. The routing service calls `JSON.parse` on the body and
threw on every request.

**Detection:** a support lead noticed the queue depth at 17:20. No alert fired.
The regression suite ran on PR #1180 and reported 9 of 9.

**Rollback:** prompt reverted 18:05. Queue drained by 19:40.

**Open:** why the suite was green. Assigned to platform.
