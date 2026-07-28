# Rank Eval guide - binary thresholds, snapshot corpora, judgment tooling

Supplementary detail for `elasticsearch-relevance-tests`. The core
`_rank_eval` workflow (judgments, metrics, request, test wrapper,
per-query regression) stays in SKILL.md; this file holds the deeper
configuration and tooling.

## `relevant_rating_threshold` for binary metrics

Per the [Elasticsearch Rank Eval API]: Precision/Recall/MRR accept
`relevant_rating_threshold` (default 1). For graded judgments:

```json
"metric": {
  "precision": {
    "k": 10,
    "relevant_rating_threshold": 2,
    "ignore_unlabeled": false
  }
}
```

Rating >= 2 counted as "relevant"; below counted as "not relevant".
The `ignore_unlabeled` flag controls whether unrated docs in
results count against precision.

## Reproducible test corpus

Snapshot the index state used for tests:

```bash
PUT _snapshot/test_repo/baseline_2026_05_06
{
  "indices": "products",
  "include_global_state": false
}
```

Restore for each CI run:

```yaml
- name: Restore index snapshot
  run: |
    curl -X POST localhost:9200/_snapshot/test_repo/baseline_2026_05_06/_restore
```

Otherwise document changes (new docs, re-indexes) silently shift
relevance baselines.

## Quepid + Splainer integration

[Quepid](https://github.com/o19s/quepid) (open source from
OpenSource Connections) provides:

- Web UI for judges to rate per-query results
- CSV export -> SKILL.md Step 1 judgment list
- "Try" tab to test query template changes against current judgments

[Splainer](https://github.com/o19s/splainer-search) explains _why_
a doc ranked where it did - invaluable for debugging unexpected
results.

[Elasticsearch Rank Eval API]: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval
