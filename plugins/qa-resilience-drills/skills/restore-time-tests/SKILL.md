---
name: restore-time-tests
description: "Build restore-time SLA tests - per-database + per-object-store baseline measurement, RTO objective verification, parallel-restore optimization tests, point-in-time-recovery (PITR) latency. Bound `time-to-functional` (TTF) ≤ documented RTO; flag silent regressions when restore time grows over months. Use when a service documents an RTO nobody has actually timed, when the backup has grown by an order of magnitude, or right after a backup-tool change."
metadata:
  keywords: "restore-time, rto, point-in-time-recovery, parallel-restore, dr-readiness"
---

# restore-time-tests

Per the [Google Cloud DR planning guide], RTO is "the maximum
acceptable length of time that your application can be offline."
Restore-time tests measure the actual time-to-functional (TTF) for
each backup type and gate it on the RTO budget.

## When to use

- DR readiness: validate stated RTO for a tier-1 service is
  achievable.
- Capacity-planning: backup grew from 100 GB to 1 TB; restore time
  no longer fits the RTO window.
- After backup-tool change: did the new tool restore at the same
  speed?

## Step 1 - Define TTF segments

Time-to-functional = sum of:

| Segment | Definition |
|---|---|
| Detection | Time from incident to "something's wrong" |
| Decision | Time from detection to "initiate DR" |
| Provisioning | Time to spin up DR environment (IaC apply) |
| Restore | Time to apply the latest backup |
| Verification | Time to run smoke tests + accept traffic |
| Cutover | DNS / load balancer switch + propagation |

Each segment has its own SLA. The aggregate is the RTO.

This skill focuses on **Restore + Verification** segments.

## Step 2 - Baseline: timed restore

```python
import subprocess, time
import pytest

@pytest.mark.benchmark
def test_postgres_restore_time_under_rto():
    # Setup: clean target DB
    subprocess.run(["psql", "-h", "test-db", "-c", "DROP DATABASE IF EXISTS db_test"])
    subprocess.run(["psql", "-h", "test-db", "-c", "CREATE DATABASE db_test"])

    backup = "postgres-prod-latest.sql.gz"

    start = time.time()
    subprocess.run(
        ["bash", "-c", f"gunzip -c {backup} | psql -h test-db -d db_test"],
        check=True,
    )
    elapsed = time.time() - start

    RTO_BUDGET_SECONDS = 4 * 3600  # 4 hours
    # The 0.5 split (restore gets half the RTO, the rest goes to provision +
    # verify + cutover) is a planning choice, NOT a standard. Set the fraction
    # from your own per-segment RTO budget (Step 1).
    RESTORE_SEGMENT_FRACTION = 0.5
    budget = RTO_BUDGET_SECONDS * RESTORE_SEGMENT_FRACTION
    assert elapsed < budget, f"Restore took {elapsed:.0f}s; budget {budget:.0f}s"
```

Run weekly in CI; track trend.

## Step 3 - Parallel-restore optimization

Many backup tools support parallelization. Test:

```bash
# pg_restore parallel
pg_restore -j 8 -d db_test backup.dump  # 8 parallel workers

# WAL-E / pgbackrest parallel restore
pgbackrest --stanza=prod --process-max=8 restore
```

```python
def test_parallel_restore_faster_than_serial():
    serial = run_restore(parallel_jobs=1)
    parallel = run_restore(parallel_jobs=8)

    speedup = serial / parallel
    # 3.0x is an illustrative target; real speedup depends on I/O saturation,
    # CPU count, and backup format. Set the expected ratio from your own
    # measured serial-vs-parallel baseline rather than this placeholder.
    assert speedup > 3.0, f"Parallel restore only {speedup:.1f}x faster"
```

Find the sweet spot (often 4-8 jobs); past that, contention
diminishes returns.

## Step 4 - Point-in-time-recovery (PITR) latency

PITR = restore the database to an arbitrary point in the past
(within retention). Restore time + WAL replay time:

PITR recovers a **pre-existing** base backup *forward* to a target time by
replaying archived WAL. It needs two things that must already exist before
the restore: a base backup taken earlier and retained, and a continuous WAL
archive covering the window up to the target. Do NOT call `pg_basebackup` at
restore time: a backup taken "now" captures the present, leaving nothing
earlier to recover to. Per the [PostgreSQL PITR docs]:

```python
def test_pitr_to_5min_ago_under_30min():
    target_time = datetime.utcnow() - timedelta(minutes=5)

    # 1. Lay down the PRE-EXISTING base backup into a clean data dir
    #    (untar the retained base backup; do not take a fresh one here).
    restore_retained_base_backup(dest="/restore")

    # 2. PG12+ recovery config: restore_command pulls archived WAL,
    #    recovery_target_time is the stop point, and recovery.signal triggers
    #    targeted recovery (recovery.conf was removed in PG12).
    write_conf("/restore/postgresql.auto.conf", {
        "restore_command": "cp /wal_archive/%f %p",
        "recovery_target_time": f"'{target_time.isoformat()}'",
        "recovery_target_action": "promote",
    })
    Path("/restore/recovery.signal").touch()

    # 3. Time the restore + WAL replay: this is the real PITR latency.
    start = time.time()
    subprocess.run(["pg_ctl", "start", "-D", "/restore", "-w"], check=True)
    wait_for_recovery_complete(timeout=1800)
    elapsed = time.time() - start

    # 1800s is illustrative; set the budget from your service's RTO segment SLA.
    assert elapsed < 1800, f"PITR took {elapsed:.0f}s; budget 30min"
```

PITR latency = base restore + WAL replay. Tests both segments.

## Step 5 - Object-store partial restore

For S3 / GCS / Azure Blob restores, time the partial restore
(not whole-bucket):

```python
def test_partial_object_restore_under_5_min():
    keys_to_restore = sample_500_keys_from_inventory()

    start = time.time()
    for key in keys_to_restore:
        s3.copy_object(
            Bucket="restore-target",
            Key=key,
            CopySource={"Bucket": "backup-versioned", "Key": key, "VersionId": ...},
        )
    elapsed = time.time() - start

    assert elapsed < 300, f"500-object restore took {elapsed:.0f}s"
```

The 500-object count and the 300s budget are illustrative; size both from
your own per-account object inventory and restore SLA.

## Step 6 - Track restore-time trend

Backup grows over time → restore time grows. Track:

```python
def emit_restore_time_metric(elapsed_seconds, backup_size_bytes):
    metrics_client.gauge("dr.restore_time_seconds", elapsed_seconds)
    metrics_client.gauge("dr.backup_size_bytes", backup_size_bytes)
    metrics_client.gauge("dr.restore_throughput_bytes_per_sec",
                          backup_size_bytes / elapsed_seconds)
```

Alert when restore time grows beyond a threshold you choose (e.g. 20% over
90 days; tune to your data-growth profile). Sustained growth indicates a
need for backup compaction, more parallelism, or RTO renegotiation.

## Step 7 - Verification time

Restore success ≠ functional. Verification adds time:

```python
def test_post_restore_smoke_under_5_min():
    do_restore()

    start = time.time()
    run_smoke_suite("dr-environment")
    elapsed = time.time() - start

    assert elapsed < 300, f"Smoke tests took {elapsed:.0f}s; budget 5min"
```

Smoke suite scope: critical paths only. Full regression is too
slow for the RTO window.

## Step 8 - Cold-start vs warm-cache

After restore, applications hit cold caches → first requests slow.
Test that the cold-start latency is within service SLA:

```python
def test_cold_start_latency_within_sla():
    # Restore complete; app started; first requests
    latencies = []
    for _ in range(100):
        start = time.time()
        requests.get("https://dr-env.svc/api/products")
        latencies.append(time.time() - start)

    p99_cold = sorted(latencies)[99]
    # 2.0s is a placeholder; set the cold-start bound from your service's SLO.
    assert p99_cold < 2.0, f"Cold-start p99 {p99_cold:.2f}s exceeds 2s SLA"
```

Cache-warm step may be needed in DR runbook (loading common
queries before declaring "functional").

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test on yesterday's backup, claim "RTO met" | Real DR uses minutes-old backup | Weekly cadence with realistic data freshness |
| Skip parallel test; use single thread | Aggregate RTO + budget breached at scale | Step 3 sweet-spot tuning |
| Skip verification time | Restore "complete"; users still 5xx | Step 7 must be timed |
| No trend tracking | Silent regression months in | Step 6 metric + alert |
| RTO unit on DB only, ignore app | App may take longer than DB | Step 8 cold-start |

## Limitations

- Real RTO depends on the worst path through the dependency
  graph; this skill measures one segment at a time.
- Some cloud-managed restores (RDS snapshot, Aurora restore) have
  fixed per-cloud SLA - verify documentation, not just test.
- Compression-heavy backups optimize for storage, not restore
  speed; tradeoffs are real.

## References

- [Google Cloud DR planning guide] - RTO context
- [PostgreSQL PITR docs] - continuous archiving + point-in-time
  recovery (base backup + WAL archive, `restore_command`,
  `recovery_target_time`, `recovery.signal`)
- `dr-drill-runner` - drill-level
  end-to-end timing
- `backup-verification-author` - 
  verifies backup integrity before restore
- `error-budget-tests` - restore
  failures consume error budget

[Google Cloud DR planning guide]: https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide
[PostgreSQL PITR docs]: https://www.postgresql.org/docs/current/continuous-archiving.html
