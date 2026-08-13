---
name: elasticsearch-relevance-tests
description: "Author search-engine relevance regression tests for Elasticsearch, OpenSearch, and Apache Solr. Core workflow on the Elasticsearch Ranking Evaluation API (`POST {index}/_rank_eval`) - judgment lists (query + expected docs at ranks), per-query metrics (Precision@K, Recall@K, MRR, DCG, ERR), reproducible test corpora; pair with Quepid + Splainer for interactive judgment authoring. Per-engine references cover the OpenSearch delta (Search Relevance Workbench, neural query DSL, hybrid BM25 + neural pipelines, ES-to-OS migration parity) and the Apache Solr delta (no _rank_eval: debugQuery score explain, LTR feature/model store REST, eDisMax qf/pf/mm tuning, external nDCG harness). Use before changing analyzers, synonyms, boosts, or query templates on an Elasticsearch, OpenSearch, or Solr index that serves user-facing search, so the NDCG / MRR baseline is captured first."
metadata:
  keywords: "elasticsearch, rank-eval, relevance-testing, judgment-list, search-quality"
---

# elasticsearch-relevance-tests

Per the [Elasticsearch Rank Eval API], the `_rank_eval` endpoint
"evaluates search result quality across typical queries using
relevance metrics."

## Engine routing

This skill is the single home for term-based engine relevance testing.
The core `_rank_eval` workflow below is authored against Elasticsearch;
the per-engine deltas live in references:

| Engine | Where | Delta |
|---|---|---|
| Elasticsearch | this SKILL.md | Built-in `_rank_eval`; the canonical workflow |
| OpenSearch | [references/opensearch.md](references/opensearch.md) | `_rank_eval`-compatible fork; Search Relevance Workbench, neural query DSL, hybrid BM25 + neural pipelines, ES-to-OS migration parity |
| Apache Solr | [references/solr.md](references/solr.md) | No `_rank_eval`; `debugQuery` explain, LTR feature/model store REST, eDisMax tuning, external nDCG harness |

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
| **Precision@K** | flat top-K accuracy; no graded weighting |
| **Recall@K** | completeness of the relevant set within top K |
| **MRR** | one good answer suffices (navigational, Q&A) |
| **DCG / NDCG** | graded relevance, rank-discounted; default for graded judgments |
| **ERR** | user-stops-at-first-relevant; rank-decay sensitive |

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

## Advanced topics

Binary-metric `relevant_rating_threshold` config, snapshotting a
reproducible test corpus for CI, and Quepid + Splainer judgment
authoring live in
[references/rank-eval-guide.md](references/rank-eval-guide.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use binary judgments only | Loses graded info; NDCG degrades to Precision | 4-point scale (Step 1) |
| Rebuild judgments per test run | Bias from current ranking | Pinned judgment list (Step 1) |
| Track only aggregate NDCG | Hides per-query regressions | Per-query tracking (Step 5) |
| Test against changing index | Baselines move under your feet | Snapshot corpus (advanced guide) |
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
- [references/opensearch.md](references/opensearch.md) - 
  OpenSearch delta (compatible API; Workbench, neural, hybrid)
- [references/solr.md](references/solr.md) - 
  Apache Solr delta (LTR, debugQuery, external nDCG)
- `vector-search-recall-tests` - 
  vector search analogue

[Elasticsearch Rank Eval API]: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval
