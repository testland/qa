# What CI runs today, per suite

| Suite              | Job                  | Median wall-clock | Shards | Owner      |
|--------------------|----------------------|-------------------|--------|------------|
| storefront e2e     | e2e:ci               | 8 min             | 4      | storefront |
| storefront unit    | node --test          | 40 s              | 1      | storefront |
| admin e2e          | admin-e2e.yml        | 41 min            | 1      | admin      |
| partner portal e2e | pytest -q            | 12 min            | 1      | platform   |

Notes:

- The admin job is a single workflow job that walks three browsers across two
  environments in sequence. It is the longest job in the repo and the only one
  over fifteen minutes.
- The partner portal Grid (4 nodes) is provisioned for the partner portal alone
  and sits idle outside its nightly window.
- Nothing in any of the three suites is currently quarantined or skipped.
- Storefront runs its browsers as separate shards and publishes JUnit XML into
  the run summary; admin publishes to the vendor dashboard only.
