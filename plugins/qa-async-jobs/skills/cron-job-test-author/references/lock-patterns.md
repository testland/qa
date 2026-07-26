# Lock patterns for cron / scheduler jobs

Two failure modes need locks: a long-running job overlapping its own next
scheduled run, and a crashed job leaving a lock that blocks every future run.

## Overlapping-run protection

If a 03:00 cron job runs longer than expected and the 04:00 schedule fires
before it finishes, what happens?

- **Unix cron**: both run concurrently. The 03:00 job and the 04:00 job
  execute in parallel.
- **Kubernetes CronJobs**: `.spec.concurrencyPolicy: Forbid` blocks the 04:00
  run; `Allow` (default) lets it run; `Replace` kills the 03:00 run.
- **BullMQ**: depends on worker concurrency; multiple workers process
  repeat-jobs in parallel by default.

Lock-based test pattern:

```python
import fcntl, sys

def acquire_lock(lock_file):
    fp = open(lock_file, 'w')
    try:
        fcntl.flock(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit(0)   # previous run still active; skip
    return fp

def test_lock_prevents_overlap(tmp_path):
    lock_file = tmp_path / "job.lock"
    fp1 = acquire_lock(str(lock_file))
    # While fp1 holds the lock, second acquire should sys.exit(0):
    with pytest.raises(SystemExit):
        acquire_lock(str(lock_file))
```

## Stale-lock recovery

A long-held lock from a crashed job blocks all future runs. Test pattern:

```python
def test_stale_lock_age_check(tmp_path):
    lock_file = tmp_path / "job.lock"
    lock_file.touch()

    # Set mtime to 25h ago (job should have completed by then):
    old_time = time.time() - 25 * 3600
    os.utime(lock_file, (old_time, old_time))

    # Recovery: detect stale lock, remove, re-acquire
    if lock_file.stat().st_mtime < time.time() - 24 * 3600:
        lock_file.unlink()
        # Now acquire fresh lock → should succeed
```
