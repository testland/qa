---
name: cron-job-test-author
description: "Build-an-X for cron / scheduler job tests - cron-expression validation patterns (5-field standard `min hour day-month month day-week` + 6-field with seconds + named-list extensions), DST + leap-day edge cases, missed-execution detection (machine downtime catch-up), overlapping-run protection (lock + stale-lock recovery), timezone semantics. Use when authoring tests for cron jobs, Kubernetes CronJobs, BullMQ repeat-jobs, Sidekiq schedulers, or any time-based job runner."
---

# cron-job-test-author

## Overview

Cron jobs are universally underspecified. Most teams ship cron
expressions, never test them, and discover bugs when DST or a leap
day rolls around. This skill is a **build-an-X workflow** for
authoring cron-job tests - a checklist + per-pattern test recipes,
not a single tool.

## When to use

- Authoring or reviewing tests for any time-scheduled job:
  - Unix cron (crontab)
  - Kubernetes CronJobs (`apiVersion: batch/v1`)
  - BullMQ `repeat` jobs (Step 6 of `bullmq-tests`)
  - Sidekiq schedulers (sidekiq-cron, sidekiq-scheduler gems)
  - APScheduler (Python)
  - Quartz (Java)
  - Hangfire (.NET)

## How to use

1. List every time-scheduled job in scope (crontab, Kubernetes CronJob,
   BullMQ repeat, Sidekiq, APScheduler, Quartz, Hangfire).
2. Validate each cron expression with `croniter` (or a language-native
   validator), parametrizing known-good and known-bad expressions (Step 1).
3. For any job near a DST transition or a leap day, compute next-run times
   with `croniter` against `zoneinfo` and assert them (Step 2).
4. Decide and test the missed-execution policy for downtime - Unix drop, k8s
   `startingDeadlineSeconds`, BullMQ drop (Step 3).
5. Add overlap and stale-lock protection with a lock, and test both (Steps
   4 - 5, [references/lock-patterns.md](references/lock-patterns.md)).
6. Assert timezone semantics explicitly via `croniter(..., tz=...)` or k8s
   `.spec.timeZone` (Step 6).
7. Run the end-to-end recipe checklist per job and wire it into CI (Step 7).

## Step 1 - Validate the cron expression

The 5-field standard:

```
┌─── minute (0-59)
│ ┌─── hour (0-23)
│ │ ┌─── day of month (1-31)
│ │ │ ┌─── month (1-12 or JAN-DEC)
│ │ │ │ ┌─── day of week (0-6 or SUN-SAT; 0 and 7 both = Sunday)
│ │ │ │ │
* * * * *
```

Six-field variants (Quartz, BullMQ pattern mode) prepend a seconds
field.

**Default: `croniter` (Python)** - it both validates expressions and computes next-run times, which Steps 2 + 6 below depend on. Use a language-native validator when the test suite isn't Python: `cron-validator` (Node), `CronExpression.isValidExpression()` (Java/Quartz), or crontab.guru for ad-hoc human checks.

**Test pattern:**

```python
from croniter import croniter
import pytest

@pytest.mark.parametrize("expr", [
    "0 3 * * *",        # daily 03:00
    "0 0 1 * *",        # monthly on the 1st
    "*/15 * * * *",     # every 15 min
    "0 9 * * 1-5",      # weekdays at 09:00
])
def test_cron_expression_is_valid(expr):
    assert croniter.is_valid(expr)
```

## Step 2 - DST + leap-day edge cases

The two highest-risk dates per year:

- **Spring-forward DST**: a window (typically 02:00 - 02:59 local)
  doesn't exist; jobs scheduled in this window may run zero or two
  times depending on cron implementation.
- **Fall-back DST**: a window (typically 01:00 - 01:59 local)
  occurs twice; jobs may run twice.
- **Feb 29**: jobs that schedule "monthly on the 29th" skip 11
  months of the year.

**Test pattern:**

```python
from croniter import croniter
from datetime import datetime
from zoneinfo import ZoneInfo

def test_daily_2am_handles_dst_spring_forward():
    # 2026 spring-forward in US/Eastern: Mar 8, 2:00 AM EST → 3:00 AM EDT
    base = datetime(2026, 3, 8, 1, 0, tzinfo=ZoneInfo("US/Eastern"))
    next_run = croniter("0 2 * * *", base).get_next(datetime)
    # croniter's behavior: skip the missing 02:00 hour, return 03:00 EDT
    assert next_run.hour == 3
    assert next_run.utcoffset().total_seconds() == -4 * 3600  # EDT
```

**Recommendation:** schedule cron jobs in UTC where possible to
avoid DST entirely. If local time is required, document the
DST-handling decision in the cron-job code.

## Step 3 - Missed-execution detection

When the host / cluster is down at the scheduled time, what happens?

- **Unix cron**: misses are silently dropped. (Use `anacron` for
  catch-up.)
- **Kubernetes CronJobs**: `.spec.startingDeadlineSeconds`
  controls how late a missed run may start (per Kubernetes
  CronJob spec).
- **BullMQ repeat**: missed runs are silently dropped; the next
  scheduled iteration runs.

**Test pattern (Kubernetes CronJob):**

```yaml
# CronJob with deadline
spec:
  schedule: "0 3 * * *"
  startingDeadlineSeconds: 300   # if not started within 5 min, skip
  concurrencyPolicy: Forbid       # don't overlap with previous run
```

```bash
# Test: simulate cluster downtime (drain nodes), then re-enable past 03:00 + 5min
# → CronJob controller should NOT trigger the missed run (past deadline)
# → CronJob controller SHOULD trigger if re-enabled past 03:00 but within deadline
```

For OSS test patterns, use `kind` (Kubernetes IN Docker) clusters in
CI to verify CronJob behavior.

## Step 4 - Overlapping-run protection

If a long-running job overlaps its next scheduled run, both may execute in
parallel (Unix cron), a concurrency policy may block / replace the new run
(Kubernetes `.spec.concurrencyPolicy`), or workers may process repeat-jobs in
parallel (BullMQ). Guard it with a lock. Per-scheduler semantics and the
`fcntl` lock test pattern are in
[references/lock-patterns.md](references/lock-patterns.md).

## Step 5 - Stale-lock recovery

A long-held lock from a crashed job blocks all future runs. Detect it with a
time-based staleness check, remove it, and re-acquire. Test pattern in
[references/lock-patterns.md](references/lock-patterns.md).

## Step 6 - Timezone semantics

```python
def test_cron_runs_at_specified_tz():
    base = datetime(2026, 5, 6, 0, 0, tzinfo=ZoneInfo("UTC"))
    # Schedule 09:00 in Tokyo (UTC+9):
    cron = croniter("0 9 * * *", base, tz="Asia/Tokyo")
    next_run = cron.get_next(datetime)
    # Should be 00:00 UTC the same day:
    assert next_run.astimezone(ZoneInfo("UTC")).hour == 0
```

For Kubernetes CronJobs, schedule timezone is set via
`.spec.timeZone` (Kubernetes 1.27+).

## Step 7 - End-to-end test recipe

For each cron job in scope:

1. ✅ Cron expression is valid (Step 1)
2. ✅ DST behavior is documented + tested (Step 2)
3. ✅ Missed-execution policy is documented + tested (Step 3)
4. ✅ Overlap protection is documented + tested (Step 4)
5. ✅ Stale-lock recovery exists (Step 5)
6. ✅ Timezone is explicit, not implicit (Step 6)
7. ✅ Job idempotency is verified (cross-ref `idempotency-test-author`)
8. ✅ Job logs include cron-expression context for debugging

## Worked example

A daily digest email is scheduled `0 2 * * *` in US/Eastern - the exact 02:00
window that spring-forward DST removes. Three tests lock it down:

1. Expression validity - `croniter.is_valid("0 2 * * *")` returns True
   (Step 1).
2. DST safety - on the 2026 spring-forward date (Mar 8) the 02:00 hour does
   not exist, so `croniter("0 2 * * *", base).get_next(datetime)` from
   `2026-03-08 01:00 US/Eastern` returns 03:00 EDT at a -4h offset; the missing
   hour is skipped, not fired twice (Step 2).
3. Overlap safety - the job takes an `fcntl` lock, and
   `test_lock_prevents_overlap` asserts a second concurrent acquire exits
   ([references/lock-patterns.md](references/lock-patterns.md)).

The suite proves the schedule is valid, survives the DST gap without zero- or
double-firing, and cannot overlap itself. The follow-up action is to move the
schedule to UTC so the DST window never applies (Step 2 recommendation).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Trust the cron expression without parsing it | Typos like `* * * 13 *` (invalid month) silently never trigger | Validate with croniter / cron-validator (Step 1) |
| Schedule in local time without documenting TZ | DST + cross-region deployments cause silent shifts | UTC where possible (Step 2) |
| No overlap protection on long-running jobs | Concurrent runs corrupt state | Lock pattern + concurrency policy (Step 4) |
| Locks without staleness recovery | Crashed job blocks all future runs forever | Time-based stale check (Step 5) |
| No alerting on missed runs | Job silently stops; discovered weeks later | Synthetic-monitor + heartbeat (cross-ref `synthetic-monitor-author`) |

## Limitations

- This is a build-an-X workflow, not a tool wrapper. Tests use
  language-native scheduler libraries; this skill is the per-job
  checklist.
- Some cron implementations have subtle differences (e.g., Quartz
  uses 6-field with seconds; Vixie cron uses 5-field). Validate
  against the actual scheduler in production.
- DST tests are environment-sensitive; use IANA TZ database (`zoneinfo`
  in Python 3.9+) for reproducibility.

## References

- crontab.guru - interactive cron-expression validator
- pypi.org/project/croniter - Python cron parser
- en.wikipedia.org/wiki/Cron - cron format spec
- Kubernetes CronJob: kubernetes.io/docs/concepts/workloads/controllers/cron-jobs
- IANA TZ database: iana.org/time-zones
- `bullmq-tests` Step 6 - BullMQ
  repeat-job pattern
- `sidekiq-tests` - Sidekiq scheduling
- `idempotency-test-author` - 
  critical companion (idempotency is the only safe answer to
  duplicate runs)
- `synthetic-monitor-author` - heartbeat-based missed-run alerting
