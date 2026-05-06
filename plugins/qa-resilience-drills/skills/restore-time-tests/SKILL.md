---
name: restore-time-tests
description: Build restore-time SLA tests — per-database + per-object-store baseline measurement, RTO objective verification, parallel-restore optimization tests, point-in-time-recovery (PITR) latency. Bound `time-to-functional` (TTF) ≤ documented RTO; flag silent regressions when restore time grows over months.
type: skill
archetype: S3
rating: 22
d6: 4
keywords:
  - restore-time
  - rto
  - point-in-time-recovery
  - parallel-restore
  - dr-readiness
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

## Step 1 — Define TTF segments

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

## Step 2 — Baseline: timed restore

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
    # Restore should be < 50% of total RTO budget (rest is provision + verify + cutover)
    assert elapsed < RTO_BUDGET_SECONDS * 0.5, \
        f"Restore took {elapsed:.0f}s; budget {RTO_BUDGET_SECONDS * 0.5:.0f}s"
```

Run weekly in CI; track trend.

## Step 3 — Parallel-restore optimization

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
    assert speedup > 3.0, f"Parallel restore only {speedup:.1f}x faster — diminishing returns"
```

Find the sweet spot (often 4-8 jobs); past that, contention
diminishes returns.

## Step 4 — Point-in-time-recovery (PITR) latency

PITR = restore the database to an arbitrary point in the past
(within retention). Restore time + WAL replay time:

```python
def test_pitr_to_5min_ago_under_30min():
    target_time = datetime.utcnow() - timedelta(minutes=5)

    start = time.time()
    subprocess.run([
        "pg_basebackup", "-h", "prod-db", "-D", "/restore", "-Ft", "-z",
    ], check=True)
    subprocess.run([
        "pg_ctl", "start", "-D", "/restore",
        "-o", f"-c recovery_target_time='{target_time.isoformat()}'",
    ], check=True)

    # Wait for recovery_target_action='pause' or successful replay
    wait_for_recovery_complete(timeout=1800)
    elapsed = time.time() - start

    assert elapsed < 1800, f"PITR took {elapsed:.0f}s; budget 30min"
```

PITR latency = base restore + WAL replay. Tests both segments.

## Step 5 — Object-store partial restore

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

500 objects = realistic single-customer-account restore size.

## Step 6 — Track restore-time trend

Backup grows over time → restore time grows. Track:

```python
def emit_restore_time_metric(elapsed_seconds, backup_size_bytes):
    metrics_client.gauge("dr.restore_time_seconds", elapsed_seconds)
    metrics_client.gauge("dr.backup_size_bytes", backup_size_bytes)
    metrics_client.gauge("dr.restore_throughput_bytes_per_sec",
                          backup_size_bytes / elapsed_seconds)
```

Alert if restore time grows > 20% in 90 days. Indicates need for
backup compaction, parallelism increase, or RTO renegotiation.

## Step 7 — Verification time

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

## Step 8 — Cold-start vs warm-cache

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
  fixed per-cloud SLA — verify documentation, not just test.
- Compression-heavy backups optimize for storage, not restore
  speed; tradeoffs are real.

## References

- [Google Cloud DR planning guide] — RTO context
- [`dr-drill-runner`](../dr-drill-runner/SKILL.md) — drill-level
  end-to-end timing
- [`backup-verification-author`](../backup-verification-author/SKILL.md) —
  verifies backup integrity before restore
- [`error-budget-tests`](../error-budget-tests/SKILL.md) — restore
  failures consume error budget

[Google Cloud DR planning guide]: https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide
