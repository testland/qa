# Help-centre retrieval - nightly job

`npm run recall` runs at 02:10 and posts recall@10 to #search-quality. The gate
is 0.95; below that the job pages the on-call. It has not paged since it was
switched on in July.

| Week starting | recall@10 | Gate |
|---------------|-----------|------|
| 2026-07-21    | 0.958     | pass |
| 2026-07-28    | 0.958     | pass |
| 2026-08-04    | 0.958     | pass |
| 2026-08-11    | 0.958     | pass |
| 2026-08-18    | 0.958     | pass |
| 2026-08-25    | 0.958     | pass |
| 2026-09-01    | 0.958     | pass |
| 2026-09-08    | 0.958     | pass |

## Content changes this quarter

- 2026-05-14 - centroids fitted, index rebuilt, nightly job switched on.
- 2026-07-02 - four billing articles reworded, re-embedded in place.
- 2026-08-18 - `network` and `account` sections published (22 new articles),
  ingested on the 19th through the same nightly pipeline. No pipeline change
  was needed; the embedding model and the index config are untouched since May.

## Support tickets tagged `search-cannot-find`

23 since 2026-08-20. Before that date the tag was used once or twice a month.

Three the support lead pulled out, each one an agent sending a customer a link
to an article the customer says they could not reach from the search box:

- HC-8841 - customer wanted the article we have as `doc-025`
- HC-8902 - `doc-031`
- HC-9014 - `doc-036`

In all 23 the article exists and the agent found it by browsing the section
tree.

## Open proposal - Priya, search infra

> We probe 2 of the 4 cells on every query. Half the index is never looked at.
> That is where the misses are. Set `nProbe` to 4 and the misses go away.

At Monday peak that is roughly double the per-query work, which is why it needs
sign-off rather than a config push.
