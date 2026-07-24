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
from cheapest to most accurate:

**1a. Proxy labels from click logs / engagement signals** (fastest):

```python
# Treat position-adjusted clicks as binary relevance
# Grade 2: clicked + dwell > 30s; Grade 1: clicked; Grade 0: impression only
def clicks_to_qrels(click_log_df):
    qrels = {}
    for _, row in click_log_df.iterrows():
        qid = row["query_id"]
        did = row["doc_id"]
        if row["dwell_s"] > 30:
            grade = 2
        elif row["clicked"]:
            grade = 1
        else:
            grade = 0
        qrels.setdefault(qid, {})[did] = grade
    return qrels
```

**1b. LLM-assisted labeling** (cost-effective at scale):

```python
import anthropic

def llm_grade(query: str, doc_text: str) -> int:
    """Return 0-3 relevance grade using an LLM as a judge."""
    client = anthropic.Anthropic()
    prompt = (
        f"Rate how relevant the document is to the query on a scale 0-3.\n"
        f"0=not relevant, 1=slightly, 2=relevant, 3=highly relevant.\n"
        f"Query: {query}\nDocument: {doc_text[:500]}\nReturn only the integer."
    )
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=10,
        messages=[{"role": "user", "content": prompt}]
    )
    return int(msg.content[0].text.strip())
```

**1c. Human annotation via pooling** (ground truth, expensive): retrieve
top-20 from all candidate systems, pool unique results, annotate each
query-document pair once. Standard TREC methodology.

Store qrels in standard TREC format: `qid 0 doc_id grade`.

## Step 2 - Define the metric suite (nDCG and MRR)

nDCG@k (Normalized Discounted Cumulative Gain) rewards placing highly
relevant documents high in the list and penalizes rank inversions.
MRR (Mean Reciprocal Rank) is appropriate when users stop at the first
relevant document (navigational queries).

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

## Step 6 - Reranker impact measurement

A reranker (cross-encoder) re-scores a candidate set returned by the
fused stage. Per [Elasticsearch semantic reranking docs], Elasticsearch
uses `text_similarity_reranker` (cross-encoder only; bi-encoder support
is planned). Per [Cohere Rerank API docs], the Cohere reranker returns a
`relevance_score` in [0, 1] and accepts up to 1,000 documents per
request.

The reranker is applied to the top-N fused candidates (a larger pool
than the final `k`). The `rank_window_size` in Elasticsearch
controls this candidate count.

**Measure reranker lift:**

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

A reranker is worth its cost when `nDCG@10(RRF+reranker)` exceeds
`nDCG@10(RRF)` and the p95 latency remains within budget. If the lift
is < 0.01 nDCG, the reranker is not earning its cost for that corpus.

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
  term-based relevance metrics for BM25-only pipelines
- `opensearch-relevance-tests` -
  term-based relevance metrics for OpenSearch BM25-only pipelines

## References

- [Elasticsearch RRF docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
- [Elasticsearch semantic reranking docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html
- [OpenSearch hybrid search blog]: https://opensearch.org/blog/hybrid-search/
- [Cohere Rerank API docs]: https://docs.cohere.com/reference/rerank

[Elasticsearch RRF docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html
[Elasticsearch semantic reranking docs]: https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-reranking.html
[OpenSearch hybrid search blog]: https://opensearch.org/blog/hybrid-search/
[Cohere Rerank API docs]: https://docs.cohere.com/reference/rerank
