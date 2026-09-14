# Help-centre retrieval - nightly job

`npm run recall` runs at 02:10 and posts recall@10 to #search-quality. Gate is
0.95; below that the job pages the on-call.

| Week starting | recall@10 | Gate |
|---------------|-----------|------|
| 2026-07-21    | 0.967     | pass |
| 2026-07-28    | 0.975     | pass |
| 2026-08-04    | 0.958     | pass |
| 2026-08-11    | 0.975     | pass |
| 2026-08-18    | 0.975     | pass |
| 2026-08-25    | 0.967     | pass |
| 2026-09-01    | 0.975     | pass |
| 2026-09-08    | 0.975     | pass |

## Support tickets tagged `search-cannot-find`

23 since 2026-08-20. Before that date the tag was used 1-2 times a month.

Three the support lead pulled out, each one an agent sending a customer a link
to an article the customer says they could not reach by searching:

- HC-8841 - customer wanted the article we have as `doc-003`
- HC-8902 - `doc-019`
- HC-9014 - `doc-036`

In every one of the 23, the article exists and the agent found it by browsing
the section tree.

## Open proposal

Priya (search infra) wants `nProbe` raised from 2 to 4 for all queries. Her
note: "we are only looking at half the index on every query, that is where the
misses are coming from". At Monday peak that is roughly twice the per-query
work, which is why it needs sign-off rather than just a config push.
