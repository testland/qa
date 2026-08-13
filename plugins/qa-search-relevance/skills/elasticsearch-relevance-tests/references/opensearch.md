# OpenSearch delta - Workbench, neural, and hybrid relevance tests

Per the [OpenSearch search-relevance docs], `_rank_eval` is
Elasticsearch-fork-compatible. The OpenSearch-specific surfaces
worth testing: neural search, hybrid query, and the Search
Relevance Workbench UI.

## When this delta applies

- Team standardized on OpenSearch (often AWS shops, often migrated
  from Elasticsearch ≤ 7.10).
- Adopting OpenSearch's neural search or hybrid search features.
- Migration test between Elasticsearch and OpenSearch - relevance
  parity must hold.

## Step 1 - Reuse the judgment list format and `_rank_eval`

OpenSearch's `_rank_eval` accepts the same JSON as Elasticsearch's -
endpoint + metrics identical per the [OpenSearch search-relevance
docs]. The main skill's Step 1 judgment list (CSV
`(query, doc_id, rating)` on the 4-point scale) and Step 3 request
body are reusable verbatim against an OpenSearch cluster. One extra
sourcing option exists here: the Search Relevance Workbench's
pairwise judgment UI + bulk import (Step 3 below).

## Step 2 - Search Relevance Workbench

Per the [OpenSearch search-relevance docs], the Search Relevance
Workbench plugin (UI in OpenSearch Dashboards) provides:

- **Query Set Management** - group queries logically (e.g., "head
  queries", "long-tail queries").
- **Judgment management** - pairwise UI for judges + bulk import
  (an extra judgment source beyond the main skill's Step 1 table).
- **Experiments** - run query-template A/B against the same
  judgment list; compare metric scores side-by-side.

Workbench experiments are the easiest pre-tuning baseline-and-compare
workflow.

## Step 3 - Neural search query

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

Pair with `vector-search-recall-tests` for HNSW parameter tuning.

## Step 4 - Hybrid (BM25 + neural)

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

## Step 5 - Per-query metric regression (same as ES)

Identical to the main skill's Step 5 - run it against the OpenSearch
cluster with its own pinned baseline file (e.g. `tests/baseline-os.json`).

## Step 6 - ES → OS migration parity test

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
| Test only BM25 path when neural enabled | Neural regression slips silently | Step 3 + Step 4 |
| Use neural without warm-up for tests | Cold cache → flaky latency tests | Warm before measuring |
| Set hybrid weights without testing both extremes | Subtle BM25/neural balance change ships | Step 4 |
| Skip migration parity test | OS deviation from ES surfaces in prod | Step 6 |
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
- The main `elasticsearch-relevance-tests` SKILL.md - compatible Rank
  Eval API + judgment format
- `vector-search-recall-tests` - 
  vector search precision/recall tooling

[OpenSearch search-relevance docs]: https://docs.opensearch.org/latest/search-plugins/search-relevance/
