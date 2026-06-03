---
name: opensearch-relevance-tests
description: "Author OpenSearch relevance tests with Search Relevance Workbench (judgment lists, query sets, experiments), `_rank_eval` API (Elasticsearch-fork-compatible), and hybrid BM25 + neural ranking eval. Reuse Elasticsearch judgment list format; document the differences (neural search query DSL, hybrid weighting via `neural_query_enricher`)."
type: skill
rating: 22
d6: 4
keywords:
  - opensearch
  - search-relevance
  - rank-eval
  - neural-search
  - hybrid-search
---

# opensearch-relevance-tests

Per the [OpenSearch search-relevance docs], `_rank_eval` is
Elasticsearch-fork-compatible. The OpenSearch-specific surfaces
worth testing: neural search, hybrid query, and the Search
Relevance Workbench UI.

## When to use

- Team standardized on OpenSearch (often AWS shops, often migrated
  from Elasticsearch ≤ 7.10).
- Adopting OpenSearch's neural search or hybrid search features.
- Migration test between Elasticsearch and OpenSearch - relevance
  parity must hold.

## Step 1 - Reuse judgment list format

OpenSearch's `_rank_eval` accepts the same JSON as Elasticsearch's.
See [`elasticsearch-relevance-tests`](../elasticsearch-relevance-tests/SKILL.md)
Step 1 for judgment list format + sourcing patterns. The CSV
`(query, doc_id, rating)` schema is reusable.

## Step 2 - Submit `_rank_eval` request

```http
POST products/_rank_eval
{
  "requests": [
    {
      "id": "running_shoes",
      "request": { "query": { "match": { "name": "running shoes" } } },
      "ratings": [
        { "_index": "products", "_id": "sku-1234", "rating": 3 }
      ]
    }
  ],
  "metric": { "dcg": { "k": 10, "normalize": true } }
}
```

Endpoint + metrics identical to Elasticsearch (per the [OpenSearch
search-relevance docs]).

## Step 3 - Search Relevance Workbench

Per the [OpenSearch search-relevance docs], the Search Relevance
Workbench plugin (UI in OpenSearch Dashboards) provides:

- **Query Set Management** - group queries logically (e.g., "head
  queries", "long-tail queries").
- **Judgment management** - pairwise UI for judges + bulk import.
- **Experiments** - run query-template A/B against the same
  judgment list; compare metric scores side-by-side.

Workbench experiments are the easiest pre-tuning baseline-and-compare
workflow.

## Step 4 - Neural search query

OpenSearch supports k-NN vector search natively. Test setup:

```http
PUT my_index
{
  "settings": { "index.knn": true },
  "mappings": {
    "properties": {
      "embedding": {
        "type": "knn_vector",
        "dimension": 768,
        "method": { "name": "hnsw", "engine": "lucene" }
      },
      "title": { "type": "text" }
    }
  }
}
```

Query:

```http
POST my_index/_search
{
  "query": {
    "neural": {
      "embedding": {
        "query_text": "running shoes for marathon",
        "model_id": "<sentence-transformer-model>",
        "k": 10
      }
    }
  }
}
```

Test that neural results meet a recall@10 target against a held-out
ground truth set:

```python
def test_neural_recall_at_10():
    ground_truth = load_ground_truth("tests/marathon_queries.json")
    for query in ground_truth["queries"]:
        results = neural_search(query["text"], k=10)
        retrieved_ids = {r["_id"] for r in results}
        relevant_ids = set(query["relevant_ids"])
        recall = len(retrieved_ids & relevant_ids) / len(relevant_ids)
        assert recall >= 0.85, f"Recall {recall:.2f} below 0.85 for query: {query['text']}"
```

Pair with `vector-search-precision-tests` for HNSW parameter tuning.

## Step 5 - Hybrid (BM25 + neural)

```http
POST my_index/_search?search_pipeline=hybrid_pipeline
{
  "query": {
    "hybrid": {
      "queries": [
        { "match": { "title": "running shoes" } },
        { "neural": { "embedding": { "query_text": "running shoes", "k": 10 } } }
      ]
    }
  }
}
```

Hybrid weighting set up via search pipeline:

```http
PUT _search/pipeline/hybrid_pipeline
{
  "phase_results_processors": [
    {
      "normalization-processor": {
        "normalization": { "technique": "min_max" },
        "combination": {
          "technique": "arithmetic_mean",
          "parameters": { "weights": [0.3, 0.7] }
        }
      }
    }
  ]
}
```

Test that hybrid weights matter:

```python
def test_hybrid_weight_change_shifts_results():
    bm25_heavy_results = search_with_pipeline("hybrid_pipeline_03_07")  # 0.3 BM25 / 0.7 neural
    neural_heavy_results = search_with_pipeline("hybrid_pipeline_07_03")
    assert bm25_heavy_results != neural_heavy_results
```

## Step 6 - Per-query metric regression (same as ES)

```python
def test_no_query_drops_more_than_10_percent():
    current = rank_eval(judgments)
    baseline = json.loads(Path("tests/baseline-os.json").read_text())

    for q_id, baseline_entry in baseline["details"].items():
        current_score = current["details"][q_id]["metric_score"]
        delta = current_score - baseline_entry["metric_score"]
        assert delta >= -0.10, f"{q_id} dropped {delta:.2f}"
```

## Step 7 - ES → OS migration parity test

Run the same judgment list against both clusters; metric scores
should be within ε:

```python
def test_es_os_parity():
    es_score = rank_eval_against("http://es:9200/products", judgments)
    os_score = rank_eval_against("http://os:9200/products", judgments)
    delta = abs(es_score - os_score)
    assert delta < 0.05, f"ES vs OS NDCG diff {delta:.2f} > 0.05"
```

If the index settings (analyzers, mappings) are identical, scores
should match. Differences point to subtle config drift.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only BM25 path when neural enabled | Neural regression slips silently | Step 4 + Step 5 |
| Use neural without warm-up for tests | Cold cache → flaky latency tests | Warm before measuring |
| Set hybrid weights without testing both extremes | Subtle BM25/neural balance change ships | Step 5 |
| Skip migration parity test | OS deviation from ES surfaces in prod | Step 7 |
| Trust default analyzers across ES/OS | Subtle stemmer differences | Pin analyzer config |

## Limitations

- Workbench UI is OpenSearch-Dashboards-only; for pure-CLI workflows,
  drive judgments + experiments via API.
- OpenSearch's neural search requires model deployment via the ML
  Commons plugin; setup steps differ from raw `_rank_eval`.
- API surface evolves; verify per the current [OpenSearch
  search-relevance docs] for new fields.
- Hybrid pipeline normalization techniques (min_max, l2) affect
  scores significantly; pin in CI.

## References

- [OpenSearch search-relevance docs] - workbench, neural, hybrid
- [`elasticsearch-relevance-tests`](../elasticsearch-relevance-tests/SKILL.md) - 
  sister skill (compatible Rank Eval API + judgment format)
- [`vector-search-precision-tests`](../vector-search-precision-tests/SKILL.md) - 
  vector search precision/recall tooling
- [`relevance-regression-reviewer`](../../agents/relevance-regression-reviewer.md)

[OpenSearch search-relevance docs]: https://docs.opensearch.org/latest/search-plugins/search-relevance/
