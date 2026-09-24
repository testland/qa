# settlement-runner - nightly batch

Kicks off at 23:10 UTC. One cycle:

1. Poll the acquirer's SFTP drop for `SETTLE_YYYYMMDD.psv` (~310 MB, 1.4M lines).
2. Parse and upsert every line into MariaDB over **JDBC**, batch size 500, against
   `settlement_line` (partitioned monthly, currently 412M rows).
3. Publish one `settlement.line.posted` message per accepted row to **IBM MQ over
   JMS**, transacted, 500 per commit.
4. POST a completion webhook to merchant-api once the cycle ends.

## 2026-08-31

Month-end. Step 2 went from 41 minutes to 4h20. Step 3 backed up behind it. The
window closed with 180k messages unsent and the acquirer reconciliation failed on
the Monday. Steps 1 and 4 completed in their usual times.

## Staging

A staging MariaDB restored from a month-end snapshot and a staging queue manager
both exist and are sized like production. Connection pool is 40, commit sizes as
above.
