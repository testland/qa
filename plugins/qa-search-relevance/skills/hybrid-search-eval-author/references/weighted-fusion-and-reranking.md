# Weighted fusion and reranker measurement

Engine-specific code for `hybrid-search-eval-author` Steps 5 and 6. The
core runnable spine (metric implementations, BM25/vector baselines, RRF
retriever, regression gate) stays in SKILL.md; this file holds the
OpenSearch weighted-fusion pipeline and the reranker snippets.

## Weighted fusion (OpenSearch normalization-processor)

Per [OpenSearch hybrid search blog], OpenSearch implements weighted fusion
via a search pipeline with a `normalization-processor`. Supported
normalization techniques: `min_max` and `l2`. Supported combination
techniques: `arithmetic_mean`, `geometric_mean`, `harmonic_mean`.

Create the pipeline:

```json
PUT /_search/pipeline/hybrid-pipeline
{
  "description": "BM25 + neural weighted fusion",
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

Run the hybrid query:

```json
POST my_index/_search?search_pipeline=hybrid-pipeline
{
  "query": {
    "hybrid": {
      "queries": [
        { "match": { "title": { "query": "{{query_text}}" } } },
        { "neural": { "passage_embedding": {
            "query_text": "{{query_text}}", "model_id": "{{model_id}}", "k": 100
        }}}
      ]
    }
  },
  "size": 10
}
```

Sweep the `weights` array to find the BM25/vector split that maximizes
nDCG@10 on your validation queries:

```python
import itertools

best_ndcg, best_weights = 0.0, None
for w_bm25 in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]:
    w_vec = round(1.0 - w_bm25, 1)
    update_pipeline_weights(w_bm25, w_vec)
    metrics = evaluate(queries, os_hybrid_retrieve_fn, qrels_all, k=10)
    if metrics["nDCG@10"] > best_ndcg:
        best_ndcg, best_weights = metrics["nDCG@10"], (w_bm25, w_vec)

print(f"Best nDCG@10={best_ndcg:.4f} at weights BM25={best_weights[0]}, vec={best_weights[1]}")
```

## Reranker impact measurement

A reranker (cross-encoder) re-scores a candidate set returned by the
fused stage. Per [Elasticsearch semantic reranking docs], Elasticsearch
uses `text_similarity_reranker` (cross-encoder only; bi-encoder support
is planned). Per [Cohere Rerank API docs], the Cohere reranker returns a
`relevance_score` in [0, 1] and accepts up to 1,000 documents per
request. The reranker is applied to the top-N fused candidates (a larger
pool than the final `k`); the `rank_window_size` in Elasticsearch
controls this candidate count.

```python
# Elasticsearch: RRF + text_similarity_reranker
def rrf_plus_rerank_retrieve(query_text, query_vector, es_client, index, k=10):
    resp = es_client.search(index=index, body={
        "retriever": {
            "text_similarity_reranker": {
                "retriever": {
                    "rrf": {
                        "retrievers": [
                            {"standard": {"query": {"match": {"text": {"query": query_text}}}}},
                            {"knn": {"field": "embedding", "query_vector": query_vector,
                                     "k": 100, "num_candidates": 200}}
                        ],
                        "rank_window_size": 100,
                        "rank_constant": 60
                    }
                },
                "field": "text",
                "inference_id": "my-rerank-model",
                "rank_window_size": 50
            }
        },
        "size": k
    })
    return [h["_id"] for h in resp["hits"]["hits"]]

# Cohere: call reranker on fused candidates
import cohere

def cohere_rerank(query_text: str, candidates: list[dict], top_n: int = 10) -> list[str]:
    """
    candidates: [{"id": "doc1", "text": "..."}, ...]
    Returns ranked doc_id list.
    Per Cohere Rerank API docs, relevance_score is in [0, 1];
    max 1,000 documents recommended per request.
    """
    co = cohere.ClientV2()
    results = co.rerank(
        model="rerank-v4.0-pro",
        query=query_text,
        documents=[c["text"] for c in candidates],
        top_n=top_n
    )
    return [candidates[r.index]["id"] for r in results.results]
```

Compare nDCG@10 and p95 latency across all four stages:

```python
stages = {
    "BM25":         bm25_metrics,
    "Vector":       knn_metrics,
    "RRF":          rrf_metrics,
    "RRF+reranker": reranked_metrics,
}
for name, m in stages.items():
    print(f"{name:15s}  nDCG@10={m['nDCG@10']:.4f}  MRR={m['MRR']:.4f}  p95={m['p95_ms']:.0f}ms")
```

[OpenSearch hybrid search blog]: https://opensearch.org/blog/hybrid-search/
[Elasticsearch semantic reranking docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html
[Cohere Rerank API docs]: https://docs.cohere.com/reference/rerank
