---
name: hybrid-search-eval-author
description: "Evaluates hybrid retrieval pipelines (BM25 + vector + reranker) end-to-end: authors ground-truth judgment sets, computes nDCG@k and MRR over fused results, measures the lift from Reciprocal Rank Fusion vs weighted fusion vs single-stage retrieval, and quantifies reranker (cross-encoder/Cohere/bge) impact. Use when a production system combines lexical and semantic retrieval and you need a numeric relevance baseline, fusion-strategy comparison, or evidence that a reranker is earning its latency cost."
metadata:
  keywords: "hybrid-search, reciprocal-rank-fusion, rrf, bm25, ndcg, mrr, reranker, cross-encoder, cohere-rerank, opensearch, elasticsearch"
---

# hybrid-search-eval-author

Hybrid retrieval (BM25 + dense vector + optional reranker) is now the
dominant production pattern for semantic search and RAG pipelines. The
sibling skill `vector-search-recall-tests` covers recall@k for the
vector stage in isolation. This skill covers the fused result: does RRF
outperform a weighted sum? Does the reranker improve nDCG@10 enough to
justify the added latency?

Per the [OpenSearch hybrid search blog], nDCG@10 improved an average of
+12.08% over BM25 across seven BEIR datasets when using hybrid queries
with normalization. The skill gives you the tests to verify - or
disprove - that claim on your own corpus.

## When to use

- Production pipeline combines BM25 (term) and kNN (dense) retrieval.
- Choosing between fusion strategies: Elasticsearch RRF vs OpenSearch
  weighted fusion vs a custom reranker pass.
- Quantifying reranker ROI: does cross-encoder/Cohere/bge lift nDCG
  enough to accept the latency increase?
- Establishing a numeric relevance baseline before a model or index
  change (regression guard).

## Step 1 - Build a judgment set (qrels)

Relevance evaluation requires graded relevance labels. Three methods,
cheapest to most accurate:

- **Proxy labels from click logs** (fastest): grade by engagement, e.g.
  clicked + dwell > 30s -> 2, clicked -> 1, impression only -> 0.
- **LLM-assisted labeling** (cost-effective at scale): prompt an LLM
  judge to return a 0-3 grade per query-document pair.
- **Human annotation via pooling** (ground truth, expensive): retrieve
  top-20 from all candidate systems, pool unique results, annotate each
  query-document pair once. Standard TREC methodology.

Store qrels in standard TREC format: `qid 0 doc_id grade`. Runnable
click-to-qrels and LLM-judge recipes:
[references/judgment-sets.md](references/judgment-sets.md).

## Step 2 - Define the metric suite (nDCG and MRR)

Use nDCG@k for graded relevance (rewards highly relevant docs ranked
high) and MRR for navigational queries where users stop at the first
relevant document. Implementations:

```python
import math

def dcg(grades: list[int], k: int) -> float:
    """Discounted Cumulative Gain at rank k."""
    return sum(
        (2 ** g - 1) / math.log2(i + 2)
        for i, g in enumerate(grades[:k])
    )

def ndcg_at_k(retrieved_ids: list[str], qrels: dict[str, int], k: int) -> float:
    """nDCG@k for a single query.
    retrieved_ids: ranked doc list (best first)
    qrels: {doc_id: grade} for this query
    """
    gains = [qrels.get(d, 0) for d in retrieved_ids[:k]]
    ideal = sorted(qrels.values(), reverse=True)
    idcg = dcg(ideal, k)
    return dcg(gains, k) / idcg if idcg > 0 else 0.0

def mrr(retrieved_ids: list[str], qrels: dict[str, int]) -> float:
    """MRR for a single query. Relevance threshold: grade >= 1."""
    for rank, doc_id in enumerate(retrieved_ids, start=1):
        if qrels.get(doc_id, 0) >= 1:
            return 1.0 / rank
    return 0.0

def evaluate(queries: list[dict], retrieve_fn, qrels_all: dict, k: int = 10):
    """
    queries: [{"id": "q1", "text": "..."}]
    retrieve_fn: callable(query_text) -> [doc_id, ...]
    qrels_all: {"q1": {"doc_a": 2, ...}, ...}
    """
    ndcg_scores, mrr_scores = [], []
    for q in queries:
        results = retrieve_fn(q["text"])
        qrels = qrels_all.get(q["id"], {})
        ndcg_scores.append(ndcg_at_k(results, qrels, k))
        mrr_scores.append(mrr(results, qrels))
    return {
        f"nDCG@{k}": sum(ndcg_scores) / len(ndcg_scores),
        "MRR":        sum(mrr_scores)  / len(mrr_scores),
    }
```

## Step 3 - Baseline: BM25-only and vector-only

Measure each stage independently before fusing. These are the baselines
against which hybrid lift is computed.

```python
# BM25-only via Elasticsearch standard retriever
def bm25_retrieve(query_text: str, es_client, index: str, k: int = 10):
    resp = es_client.search(index=index, body={
        "retriever": {"standard": {"query": {"match": {"text": {"query": query_text}}}}},
        "size": k
    })
    return [h["_id"] for h in resp["hits"]["hits"]]

# Vector-only via knn retriever
def knn_retrieve(query_text: str, es_client, index: str, query_vector, k: int = 10):
    resp = es_client.search(index=index, body={
        "retriever": {"knn": {"field": "embedding", "query_vector": query_vector,
                              "k": k, "num_candidates": k * 10}},
        "size": k
    })
    return [h["_id"] for h in resp["hits"]["hits"]]

bm25_metrics = evaluate(queries, bm25_retrieve_fn,  qrels_all, k=10)
knn_metrics  = evaluate(queries, knn_retrieve_fn,   qrels_all, k=10)
print("BM25-only:", bm25_metrics)
print("Vector-only:", knn_metrics)
```

## Step 4 - Reciprocal Rank Fusion (RRF)

Per [Elasticsearch RRF docs], RRF applies `score += 1 / (rank_constant + rank)`
across every sub-retriever result, then re-ranks. The formula requires no
score normalization because it operates on rank positions, not raw scores.

Key parameters per [Elasticsearch RRF docs]:
- `rank_constant` (default 60): higher values give lower-ranked documents
  more weight. Must be >= 1.
- `rank_window_size` (default = search `size`): per-retriever candidate
  set size before fusion. Must be >= 1.

```python
# Elasticsearch RRF retriever (combining BM25 + kNN)
def rrf_retrieve(query_text: str, query_vector, es_client, index: str, k: int = 10):
    resp = es_client.search(index=index, body={
        "retriever": {
            "rrf": {
                "retrievers": [
                    {"standard": {"query": {"match": {"text": {"query": query_text}}}}},
                    {"knn": {"field": "embedding", "query_vector": query_vector,
                             "k": 50, "num_candidates": 100}}
                ],
                "rank_constant": 60,
                "rank_window_size": 50
            }
        },
        "size": k
    })
    return [h["_id"] for h in resp["hits"]["hits"]]

rrf_metrics = evaluate(queries, rrf_retrieve_fn, qrels_all, k=10)
print("RRF hybrid:", rrf_metrics)
```

RRF is appropriate when BM25 and vector scores are on incompatible scales
(which is almost always). It requires no normalization step.

## Step 5 - Weighted fusion (OpenSearch normalization-processor)

Per [OpenSearch hybrid search blog], OpenSearch implements weighted fusion
via a search pipeline with a `normalization-processor`. Normalization
techniques: `min_max`, `l2`. Combination techniques: `arithmetic_mean`,
`geometric_mean`, `harmonic_mean`. Sweep the `weights` array to find the
BM25/vector split that maximizes nDCG@10 on your validation queries.

Pipeline definition, hybrid query, and the weight-sweep loop:
[references/weighted-fusion-and-reranking.md](references/weighted-fusion-and-reranking.md).

## Step 6 - Reranker impact measurement

A reranker (cross-encoder) re-scores the top-N fused candidates (a larger
pool than the final `k`; Elasticsearch's `rank_window_size` controls this
count). Per [Elasticsearch semantic reranking docs], Elasticsearch uses
`text_similarity_reranker` (cross-encoder only; bi-encoder support is
planned). Per [Cohere Rerank API docs], the Cohere reranker returns a
`relevance_score` in [0, 1] and accepts up to 1,000 documents per request.

A reranker is worth its cost when `nDCG@10(RRF+reranker)` exceeds
`nDCG@10(RRF)` and the p95 latency remains within budget. If the lift
is < 0.01 nDCG, the reranker is not earning its cost for that corpus.

Elasticsearch `text_similarity_reranker` and Cohere rerank code, plus
the four-stage nDCG/latency comparison:
[references/weighted-fusion-and-reranking.md](references/weighted-fusion-and-reranking.md).

## Step 7 - Regression gate (CI)

Protect a proven fusion setup with a threshold test:

```python
import pytest

NDCG_FLOOR    = 0.42   # set from your current best system
MRR_FLOOR     = 0.55
LATENCY_P95_MS = 120

def test_hybrid_relevance_regression():
    m = evaluate(VAL_QUERIES, rrf_plus_rerank_retrieve_fn, QRELS, k=10)
    assert m["nDCG@10"] >= NDCG_FLOOR,    f"nDCG@10 {m['nDCG@10']:.4f} < floor {NDCG_FLOOR}"
    assert m["MRR"]     >= MRR_FLOOR,     f"MRR {m['MRR']:.4f} < floor {MRR_FLOOR}"
    p95 = measure_latency_p95(VAL_QUERIES, rrf_plus_rerank_retrieve_fn)
    assert p95 <= LATENCY_P95_MS,         f"p95 {p95:.0f}ms > budget {LATENCY_P95_MS}ms"
```

Run this in CI on every retrieval pipeline change (embedding model swap,
index rebuild, fusion-weight update, reranker version bump).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Compare hybrid to BM25 without measuring nDCG | Click-rate or position-bias metrics can be gamed | Use graded qrels + nDCG (Steps 1-2) |
| Tune fusion weights on the same queries used to evaluate | Overfits to eval set | Hold out a test split; tune on validation only (Step 5) |
| Use RRF `rank_window_size` = final `k` | Fusion candidate pool too small; relevant docs pruned early | Set `rank_window_size` >= 2x final k |
| Skip reranker latency measurement | nDCG improves but p95 blows the budget | Always pair nDCG lift with p95 delta (Step 6) |
| Send all retrieved docs to Cohere Rerank | > 1,000 docs per request degrades performance | Cap at 100-200 candidates; use `top_n` for final k |
| Reuse vector-search ground truth for hybrid eval | Different result sets, different relevant docs | Build qrels from the pooled union of all stage outputs |

## Limitations

- LLM-as-judge grading (Step 1b) introduces annotator variance; calibrate
  against a small human-labeled held-out set before relying on it.
- Per [OpenSearch hybrid search blog], hybrid queries incur 6-8% latency
  overhead vs. Boolean-only. Rerankers add further latency proportional to
  `rank_window_size`.
- nDCG@10 benchmarks in the [OpenSearch hybrid search blog] (avg +12.08%)
  used BEIR datasets; domain-specific corpora vary widely.
- The [Elasticsearch RRF docs] note that scroll, sort, and rescore
  operations are unsupported inside an `rrf` retriever.

## Related skills

- `vector-search-recall-tests` -
  recall@k and HNSW tuning for the vector stage in isolation
- `elasticsearch-relevance-tests` -
  term-based relevance metrics for BM25-only pipelines (per-engine
  OpenSearch and Solr deltas in its references/)

## References

- [Elasticsearch RRF docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
- [Elasticsearch semantic reranking docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html
- [OpenSearch hybrid search blog]: https://opensearch.org/blog/hybrid-search/
- [Cohere Rerank API docs]: https://docs.cohere.com/reference/rerank

[Elasticsearch RRF docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
[Elasticsearch semantic reranking docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html
[OpenSearch hybrid search blog]: https://opensearch.org/blog/hybrid-search/
[Cohere Rerank API docs]: https://docs.cohere.com/reference/rerank
