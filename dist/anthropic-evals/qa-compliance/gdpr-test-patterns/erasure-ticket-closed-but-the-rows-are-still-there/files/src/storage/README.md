# Nightly snapshots

`snapshots.js` is the read model over the nightly snapshot bucket.

The bucket is configured with object lock in compliance mode for
`RETENTION_DAYS`. A snapshot object cannot be overwritten, edited or deleted by
anyone, including the bucket owner, before `expiresAt`.
