# INC-4471 - catalogue search recall

## Timeline

| When (UTC)       | What                                                          |
|------------------|---------------------------------------------------------------|
| 2026-09-11 16:40 | Embedding provider change deployed to production.              |
| 2026-09-12 02:10 | Nightly posted recall@10 0.606. Gate is 0.95. On-call paged.   |
| 2026-09-12 07:55 | Incident opened. Rollback PR #3318 prepared and held.          |
| 2026-09-13 09:00 | Incident review scheduled for Monday; needs a figure and a decision. |

The morning before the change the same job posted 0.962. It had been between
0.955 and 0.971 every morning since the job was switched on.

## What the 2026-09-11 deploy did

1. Re-embedded all 56 catalogue items with the new provider.
2. Re-embedded the 16 saved evaluation queries with the new provider.
3. Re-fitted the six cell centroids over the re-embedded catalogue.
4. Rebuilt and redeployed the index.
5. Re-ran the nightly job.

No other change shipped that day. Cell count, `nProbe`, the `k` we retrieve
and the gate are all where they were in August.

## What the nightly job does

Build the index from `data/corpus.json`, run the 16 queries in
`data/queries.json`, compare the ten ids each one returns against
`data/ground-truth.json` - which is frozen and committed, so the metric is
reproducible run to run and two mornings are comparable - and post recall@10.

## Positions

**Marcus (search):** "0.606 against 0.962. The number is not ambiguous. Roll it
back today and we can evaluate the provider properly in Q4."

**Dinah (platform):** the new provider is 60% cheaper per million tokens and we
have already cut over three other services to it. Rolling this one back means
running both providers and re-embedding the catalogue a third time.

**Merch:** spot-checked about thirty searches by hand on Friday afternoon and
preferred the new results on most of them, which they concede is not evidence.

## Wanted from this review

- A go or no-go on #3318, with the numbers it rests on.
- A figure for the incident record: how far did recall actually fall.
