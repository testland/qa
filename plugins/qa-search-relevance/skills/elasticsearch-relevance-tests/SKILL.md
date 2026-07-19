---
name: elasticsearch-relevance-tests
description: "Author Elasticsearch relevance regression tests using the Ranking Evaluation API (`POST <index>/_rank_eval`) - judgment lists (query + expected docs at ranks), per-query metrics (Precision@K, Recall@K, MRR, DCG, ERR), reproducible test corpora; pair with Quepid + Splainer for interactive judgment authoring. Use before changing analyzers, synonyms, boosts, or query templates on an Elasticsearch index that serves user-facing search, so the NDCG / MRR baseline is captured first."
metadata:
  keywords: "elasticsearch, rank-eval, relevance-testing, judgment-list, search-quality"
---

# elasticsearch-relevance-tests

Per the [Elasticsearch Rank Eval API], the `_rank_eval` endpoint
"evaluates search result quality across typical queries using
relevance metrics." This is the canonical IR-metrics-driven approach
to search QA - far better than spot-checking results.

## When to use

- Search-driven product (e-commerce, docs site, internal portal)
  where relevance regression directly affects business outcomes.
- Pre-deploy gate before changing analyzers, synonyms, boosts,
  query templates.
- A/B baseline: capture today's NDCG/MRR before tuning so you can
  prove improvement (or detect regression).

## Step 1 - Build the judgment list

A judgment is `(query, doc_id, rating)`. Ratings: 0 = irrelevant,
1 = somewhat, 2 = relevant, 3 = highly relevant (4-point scale).
Build judgments via:

| Source | Method |
|---|---|
| Query logs + click data | Click model (clicked = ≥1, multi-click = ≥2) |
| Quepid (open source) | Interactive UI for judges to rate per-query results |
| Splainer | Diagnose why a doc ranked where it did |
| Domain SMEs | High-stakes queries; manual rating |

Judgment list format (CSV is common):

```csv
query,doc_id,rating
"running shoes",sku-1234,3
"running shoes",sku-5678,2
"running shoes",sku-9999,0
"red dress",sku-2222,3
```

## Step 2 - Define metrics for your domain

Per the [Elasticsearch Rank Eval API]:

| Metric | When to use |
|---|---|
| **Precision@K** | "Of the top K, how many relevant?" - flat scoring |
| **Recall@K** | "Of all relevant, how many in top K?" - completeness |
| **MRR** | "Where's the first relevant?" - search where one good answer suffices |
| **DCG / NDCG** | Graded relevance; rank-discounted; the default for graded judgments |
| **ERR (Expected Reciprocal Rank)** | User-stops-at-first-relevant model; rank-decay sensitive |

For e-commerce with graded judgments → NDCG@10 + MRR. For Q&A → MRR
+ Precision@1.

## Step 3 - Submit a rank_eval request

Per the [Elasticsearch Rank Eval API]:

```http
POST products/_rank_eval
{
  "requests": [
    {
      "id": "running_shoes_query",
      "request": {
        "query": { "match": { "name": "running shoes" } }
      },
      "ratings": [
        { "_index": "products", "_id": "sku-1234", "rating": 3 },
        { "_index": "products", "_id": "sku-5678", "rating": 2 },
        { "_index": "products", "_id": "sku-9999", "rating": 0 }
      ]
    },
    {
      "id": "red_dress_query",
      "request": { "query": { "match": { "name": "red dress" } } },
      "ratings": [
        { "_index": "products", "_id": "sku-2222", "rating": 3 }
      ]
    }
  ],
  "metric": {
    "dcg": { "k": 10, "normalize": true }
  }
}
```

Response shape:

```json
{
  "metric_score": 0.84,
  "details": {
    "running_shoes_query": { "metric_score": 0.91, "unrated_docs": [...] },
    "red_dress_query": { "metric_score": 0.77, "unrated_docs": [...] }
  }
}
```

## Step 4 - Wrap as a test

```python
import requests, csv

def load_judgments(path):
    by_query = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            by_query.setdefault(row["query"], []).append({
                "_index": "products",
                "_id": row["doc_id"],
                "rating": int(row["rating"]),
            })
    return by_query

def test_search_relevance_baseline():
    judgments = load_judgments("tests/judgments.csv")
    requests_payload = [
        {
            "id": q.replace(" ", "_"),
            "request": { "query": { "match": { "name": q } } },
            "ratings": ratings,
        }
        for q, ratings in judgments.items()
    ]
    body = {
        "requests": requests_payload,
        "metric": { "dcg": { "k": 10, "normalize": true } },
    }
    r = requests.post("http://localhost:9200/products/_rank_eval", json=body)
    result = r.json()

    # Baseline NDCG must not regress vs known-good
    assert result["metric_score"] >= 0.80, f"NDCG@10 regressed: {result['metric_score']}"
```

## Step 5 - Per-query regression detection

Aggregate metric only catches large shifts. Track per-query:

```python
def test_no_query_drops_more_than_10_percent():
    current = run_rank_eval()
    baseline = json.loads(Path("tests/baseline.json").read_text())

    for query_id, baseline_score in baseline["details"].items():
        current_score = current["details"][query_id]["metric_score"]
        delta = current_score - baseline_score["metric_score"]
        assert delta >= -0.10, \
            f"Query {query_id} dropped {delta:.2f} (was {baseline_score['metric_score']:.2f}, now {current_score:.2f})"
```

## Step 6 - `relevant_rating_threshold` for binary metrics

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

Rating ≥ 2 counted as "relevant"; below counted as "not relevant".
The `ignore_unlabeled` flag controls whether unrated docs in
results count against precision.

## Step 7 - Reproducible test corpus

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

## Step 8 - Quepid + Splainer integration

[Quepid](https://github.com/o19s/quepid) (open source from
OpenSource Connections) provides:

- Web UI for judges to rate per-query results
- CSV export → Step 1 judgment list
- "Try" tab to test query template changes against current judgments

[Splainer](https://github.com/o19s/splainer-search) explains _why_
a doc ranked where it did - invaluable for debugging unexpected
results.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use binary judgments only | Loses graded info; NDCG degrades to Precision | 4-point scale (Step 1) |
| Rebuild judgments per test run | Bias from current ranking | Pinned judgment list (Step 1) |
| Track only aggregate NDCG | Hides per-query regressions | Per-query tracking (Step 5) |
| Test against changing index | Baselines move under your feet | Snapshot index (Step 7) |
| 100% click-derived judgments | Click bias to top results, position bias | Mix click + SME judgments |

## Limitations

- Judgments are expensive; budget hundreds-to-thousands of
  query-doc pairs for a meaningful test set.
- Click-derived judgments have position bias; correct using
  click models (cascade, dynamic Bayesian).
- Rank Eval API doesn't natively support relevance graded > 4 or
  pairwise comparisons.
- Synonyms, language analyzers, custom scoring matter - pin in CI.

## References

- [Elasticsearch Rank Eval API] - request/response schema, metrics
- Quepid (judgment authoring UI) - github.com/o19s/quepid
- Splainer (debug per-doc ranking) - github.com/o19s/splainer-search
- [`opensearch-relevance-tests`](../opensearch-relevance-tests/SKILL.md) - 
  sister skill (compatible API)
- [`vector-search-precision-tests`](../vector-search-precision-tests/SKILL.md) - 
  vector search analogue

[Elasticsearch Rank Eval API]: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval
