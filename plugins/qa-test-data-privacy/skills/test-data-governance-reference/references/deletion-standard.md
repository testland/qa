# Deletion of test data containing real PII

Referenced from [SKILL.md](../SKILL.md).

## When deletion is required

Deletion is required when any of these conditions is met:

- Retention expiry for the assigned tier (see the tier table in SKILL.md).
- Test run or sprint that justified the dataset is complete.
- Data steward receives a data-subject erasure request that reaches back to
  a production source from which a test dataset was derived (GDPR Art. 17
  right to erasure propagates to derived test copies).
- Environment is decommissioned or reassigned.
- Masking audit reveals that an unmasked field slipped through
  (a leak-detection audit raises this flag).

## Deletion standard

Deletion from relational databases must remove the rows and the backup
snapshots of the test environment taken while the PII was present - retaining
a backup that contains the PII extends the effective retention period.

For file-based fixtures (JSON, CSV, SQL dumps): overwrite or securely delete
the file and remove it from version control history. Presence in git history
counts as retention under GDPR Art. 5(1)(e).

Upon deletion, the data steward issues a **deletion certificate** containing:

- Dataset ID
- Date of deletion
- Method (truncate, secure delete, environment wipe)
- Confirmation that backups containing the dataset were also deleted or expired
- Steward signature (or equivalent approval record)

The certificate populates the governance register's Deletion certificate
reference field and satisfies the GDPR Art. 5(2) accountability requirement.
