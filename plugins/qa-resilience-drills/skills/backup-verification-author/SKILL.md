---
name: backup-verification-author
description: "Author backup-verification harness - per-backup-type integrity (SHA-256 / encrypted-payload signature), restore-to-test-env spot-check cadence, partial-restore (single-table / single-object) verification, cross-region replication validation, retention-policy assertions. \"An untested backup is not a backup."
type: skill
rating: 22
d6: 4
keywords:
  - backup-verification
  - integrity-check
  - restore-spot-check
  - retention
  - cross-region-replication
---

# backup-verification-author

Backups silently fail in many ways - wrong encryption key, missing
volume, corrupted file, expired credential. Per the [Google Cloud
DR planning guide], DR success requires "end-to-end recovery design
addressing backup, restoration, and cleanup procedures." This skill
authors the verification harness.

## When to use

- Building DR readiness for a new service.
- Backup-tool migration (Restic → Borg, AWS Backup → Veeam) - 
  verify the new tool works on real data.
- Compliance audit: prove backups are tested + integrity-checked.

## Step 1 - Catalog backup types

```markdown
## Backup Catalog — `<service>`

| Type | Source | Frequency | Retention | Tool |
|---|---|---|---|---|
| Full DB dump | postgres prod | Daily 02:00 UTC | 30 days | pg_dump + S3 |
| Logical schema | postgres prod | Hourly | 24 hours | logical replication slot |
| File store | S3 prod bucket | Continuous | 90 days | S3 versioning + cross-region |
| Audit log | append-only S3 | Continuous | 7 years | S3 + Glacier |
| Secrets / KMS keys | Vault prod | Daily | 7 days | Vault snapshot + encrypted S3 |
```

Each row needs its own verification step (Step 3).

## Step 2 - Integrity checks at backup time

```bash
#!/usr/bin/env bash
set -e

BACKUP_FILE="postgres-prod-$(date +%Y%m%d).sql.gz"
BACKUP_PATH="/backups/$BACKUP_FILE"

# Take backup
pg_dump -h prod-db -U replica db_name | gzip > "$BACKUP_PATH"

# Generate SHA-256 + sign
sha256sum "$BACKUP_PATH" > "$BACKUP_PATH.sha256"
gpg --detach-sign --armor "$BACKUP_PATH"

# Upload to backup destination
aws s3 cp "$BACKUP_PATH" "s3://backup/postgres/$BACKUP_FILE"
aws s3 cp "$BACKUP_PATH.sha256" "s3://backup/postgres/$BACKUP_FILE.sha256"
aws s3 cp "$BACKUP_PATH.asc" "s3://backup/postgres/$BACKUP_FILE.asc"

# Tag with metadata
aws s3api put-object-tagging \
  --bucket backup --key "postgres/$BACKUP_FILE" \
  --tagging 'TagSet=[{Key=integrity_verified,Value=true},{Key=created,Value='$(date -Iseconds)'}]'
```

Tests assert:

- SHA matches at upload.
- Signature verifies with the correct key.
- Tag present.

## Step 3 - Restore-to-test-env spot check

A restore that has never been done is not a backup. Schedule:

```yaml
# CI cron: weekly random sample
- cron: "0 4 * * 1"  # Monday 04:00 UTC
  job:
    - name: Pick random backup
      run: |
        DAYS=(1 7 14 30)
        DAYS_AGO=${DAYS[$RANDOM % ${#DAYS[@]}]}
        BACKUP=$(date -d "$DAYS_AGO days ago" +%Y%m%d)
        echo "BACKUP=postgres-prod-$BACKUP.sql.gz" >> $GITHUB_ENV

    - name: Verify integrity
      run: |
        aws s3 cp s3://backup/postgres/$BACKUP.sha256 .
        aws s3 cp s3://backup/postgres/$BACKUP .
        sha256sum -c "$BACKUP.sha256"

    - name: Restore to test DB
      run: |
        gunzip "$BACKUP"
        psql -h test-db -U test -f "${BACKUP%.gz}" db_test

    - name: Spot check
      run: |
        psql -h test-db -U test db_test -c "SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 day'"
        # Verify count > 0 (or whatever invariant fits)
```

## Step 4 - Partial-restore test

Real DR scenarios often need single-table or single-object restore
(not full DB):

```bash
# Single-table extract + restore
pg_restore --table=orders --data-only \
  -h test-db -U test -d db_test \
  postgres-prod-backup.dump
```

Test: extract one table; assert rowcount + checksum match the
production-time snapshot.

For S3 single-object:

```bash
aws s3 cp \
  s3://backup-versioned/object-key \
  --version-id "VERSION_ID_AT_DESIRED_TIME" \
  ./restored-object
```

## Step 5 - Cross-region replication test

```python
def test_backup_replicated_to_dr_region():
    # Take a backup in primary region
    backup_path_primary = take_backup_to(region="us-east-1")

    # Wait for replication SLA
    deadline = time.time() + 300  # 5 min SLA
    while time.time() < deadline:
        if exists_in(region="us-west-2", path=backup_path_primary):
            return
        time.sleep(10)

    pytest.fail("Cross-region replication exceeded 5min SLA")
```

Per the [Google Cloud DR planning guide]: "Security synchronization"
also matters - DR region must have the same KMS keys / IAM /
secrets, not just the data.

## Step 6 - Retention-policy verification

```python
def test_old_backups_purged_per_retention_policy():
    # 30-day retention; 100-day-old backup should not exist
    target = (datetime.utcnow() - timedelta(days=100)).strftime("%Y%m%d")
    obj_key = f"postgres/postgres-prod-{target}.sql.gz"

    response = s3.head_object(Bucket="backup", Key=obj_key)
    # Should 404
    pytest.fail(f"Backup {obj_key} still exists past 30-day retention")
```

Wrap in a try/except - actual missing object = pass.

```python
def test_recent_backups_present():
    # Last 30 days should have at least one daily backup each
    for d in range(30):
        date = (datetime.utcnow() - timedelta(days=d)).strftime("%Y%m%d")
        key = f"postgres/postgres-prod-{date}.sql.gz"
        s3.head_object(Bucket="backup", Key=key)  # raises if missing
```

## Step 7 - Encryption verification

For encrypted backups, verify both:
- The backup is encrypted at rest (S3 SSE-KMS / GCP CMEK / Azure
  CMK).
- The encryption key is recoverable in DR (key escrow + cross-region
  replication of the key).

```python
def test_backup_encrypted_with_correct_key():
    obj = s3.head_object(Bucket="backup", Key=key)
    assert obj["ServerSideEncryption"] == "aws:kms"
    assert obj["SSEKMSKeyId"] == EXPECTED_KMS_KEY_ARN
```

## Step 8 - Customer-induced backup test (compliance)

Some regulations (HIPAA, SOC 2) require demonstrated ability to
restore on demand. Author the workflow:

```markdown
## Customer-Induced Backup Restore Test

1. Customer requests demo restore via support ticket.
2. SRE picks a random recent backup; restores to clean isolated env.
3. Customer verifies their data via read-only SQL or UI.
4. Cleanup: tear down env, sanitize logs.
5. Document: ticket + timestamps + verification artifacts → audit log.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Verify backup file exists; not contents | Corrupt files pass | SHA + restore (Steps 2-3) |
| Test restore once, never again | Bit rot, key rotation, schema drift surface later | Weekly cadence (Step 3) |
| Skip partial-restore test | Real DR usually wants partial; full restore takes too long | Step 4 |
| Skip key recovery | Backup encrypted with key not in DR region; useless | Step 7 |
| Trust replication "succeeded" status | Async replication can claim success then fail | Step 5 explicit verification |

## Limitations

- Backup verification doesn't test the restore-time SLA - see
  `restore-time-tests` for that.
- Some legal regimes prescribe per-restore audit records; this skill
  covers the test pattern, not the legal compliance.
- Cloud-managed backup services (AWS Backup, Veeam Cloud) handle
  some steps; verify the boundary clearly.

## References

- [Google Cloud DR planning guide] - DR planning context
- [`dr-drill-runner`](../dr-drill-runner/SKILL.md) - drill-level
  workflow that consumes verified backups
- [`restore-time-tests`](../restore-time-tests/SKILL.md) - RTO
  verification of the restore process
- [`qa-secrets/secrets-rotation-runner`](../../../qa-secrets/skills/secrets-rotation-runner/SKILL.md) - 
  related rotation workflow

[Google Cloud DR planning guide]: https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide
