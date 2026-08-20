# Contact import - what it is meant to do

- Accepts CSV up to 100,000 rows, comma-delimited, UTF-8.
- Detects columns and offers a mapping screen; the mapping is remembered per
  user for the next import.
- Duplicate handling: a contact matching an existing record by email is
  merged, not duplicated, unless the user opts into "always create new".
- Phone numbers are normalised to E.164 on save.
- Imports run asynchronously on a worker; the user gets an email when the
  run finishes, with a row-level error report attached.
- Rollback: an entire import run can be reverted within 24 hours.

Not yet covered by anyone: the email report, the rollback path, the
per-user remembered mapping, and the "always create new" option.
