---
name: vector-search-precision-tests
description: "Vector search benchmarking - recall@k vs latency tradeoffs, ground-truth construction via brute-force, HNSW tuning (M / ef_construct / ef per Qdrant docs), embedding-model-upgrade drift detection. Use ANN-Benchmarks framework for cross-engine comparison; per-engine clients (Qdrant, Weaviate, pgvector, Pinecone, Elasticsearch k-NN, Milvus) for in-product tests."
metadata:
  keywords: "vector-search, ann-benchmarks, hnsw, recall-at-k, embedding-drift"
---

# vector-search-precision-tests

Per the [ANN-Benchmarks docs] and [Qdrant search docs], tests must
measure recall@k against known ground truth - engine self-eval
doesn't catch index corruption or parameter drift.

## When to use

- Production uses vector search for retrieval (RAG, semantic search,
  recommendations).
- HNSW / IVF / ScaNN parameter tuning - need quantitative test for
  the recall/latency Pareto curve.
- Embedding model upgrade - verify recall doesn't drop on the
  existing corpus.

## Step 1 - Construct ground truth (brute-force k-NN)

Ground truth = top-k closest documents under exact (brute-force)
distance. Compute once for a fixed query set:

```python
import numpy as np
from sklearn.neighbors import NearestNeighbors

def compute_ground_truth(corpus_vectors, query_vectors, k=10):
    nn = NearestNeighbors(n_neighbors=k, algorithm="brute", metric="cosine")
    nn.fit(corpus_vectors)
    distances, indices = nn.kneighbors(query_vectors)
    return indices  # shape (n_queries, k)
```

Save indices alongside corpus + queries; recompute only if corpus
or embedding model changes.

## Step 2 - Recall@k measurement

```python
def recall_at_k(retrieved_ids, ground_truth_ids):
    """Both: list of doc-id arrays, length n_queries; each row top-k retrieved."""
    recalls = []
    for retr, gt in zip(retrieved_ids, ground_truth_ids):
        recalls.append(len(set(retr) & set(gt)) / len(gt))
    return float(np.mean(recalls))
```

For a given engine + parameter set, retrieve via the engine's API,
then compute recall@k. Typical target: recall@10 ≥ 0.95 for
production search.

## Step 3 - HNSW parameter sweep

Per [Qdrant search docs], HNSW tunables:

| Parameter | Effect | Tradeoff |
|---|---|---|
| `M` | Connections per node in the graph | Higher M = better recall + larger index size |
| `ef_construct` | Build-time search width | Higher = better recall + slower indexing |
| `ef` | Query-time search width | Higher = better recall + slower queries |

Per [Qdrant search docs]: "Increasing `ef` and `ef_construct`
improves recall but increases computational latency."

Sweep, using the real Qdrant client. Per the [Qdrant search docs], `ef`
(a.k.a. `hnsw_ef`) is a query-time parameter passed in `SearchParams`, so the
sweep just varies it per call:

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")
COLLECTION = "docs"  # points upserted with id == corpus index (to match ground truth)

def qdrant_search(query_vec, ef, k=10):
    # client.search() was removed in qdrant-client 1.18; use query_points.
    # exact=False keeps the query on the HNSW path; exact=True is the oracle.
    resp = client.query_points(
        collection_name=COLLECTION,
        query=query_vec,
        search_params=models.SearchParams(hnsw_ef=ef, exact=False),
        limit=k,
        with_payload=False,
    )
    return [p.id for p in resp.points]

ef_values = [16, 32, 64, 128, 256]
results = []
for ef in ef_values:
    retrieved = [qdrant_search(q, ef=ef, k=10) for q in query_vectors]
    recall = recall_at_k(retrieved, ground_truth)
    results.append({"ef": ef, "recall": recall})
    # Pair with measure_latency() from Step 4 to capture p95 at this ef.

# Find smallest ef that hits the recall target.
for r in results:
    if r["recall"] >= 0.95:
        print(f"smallest ef hitting target: ef={r['ef']} -> recall {r['recall']:.3f}")
        break
```

In **Weaviate v4** `ef` is not a query argument: it is a collection
`vectorIndexConfig` setting, so the sweep updates the collection config
between rounds, then re-queries (per the [Weaviate Python client docs]):

```python
from weaviate.classes.config import Reconfigure
from weaviate.classes.query import MetadataQuery

def set_weaviate_ef(client, ef, vector_name="default"):
    client.collections.use("Docs").config.update(
        vector_config=Reconfigure.Vectors.update(
            name=vector_name,
            vector_index_config=Reconfigure.VectorIndex.hnsw(ef=ef),
        ),
    )

def weaviate_search(client, query_vec, k=10):
    resp = client.collections.use("Docs").query.near_vector(
        near_vector=query_vec, limit=k, return_metadata=MetadataQuery(distance=True)
    )
    return [o.uuid for o in resp.objects]  # match against UUID-keyed ground truth
```

## Step 4 - Latency p50 / p95 / p99 budget

Recall-only is a trap. Pair with latency:

```python
import time

def measure_latency(queries, engine_search_fn):
    times = []
    for q in queries:
        t0 = time.perf_counter()
        engine_search_fn(q, k=10)
        times.append((time.perf_counter() - t0) * 1000)
    times.sort()
    return {
        "p50": times[len(times) // 2],
        "p95": times[int(len(times) * 0.95)],
        "p99": times[int(len(times) * 0.99)],
    }

def test_latency_under_budget():
    lat = measure_latency(queries, qdrant_search)
    assert lat["p95"] < 50, f"p95 {lat['p95']:.1f}ms exceeds 50ms budget"
```

## Step 5 - Embedding-model drift test

Embedding model upgrade (`text-embedding-3-small` → `-3-large`) =
all vectors invalidated. Test the new corpus's ground truth:

```python
def test_recall_holds_after_embedding_upgrade():
    # Pre-upgrade baseline
    old_recall = baseline_recall_for("text-embedding-3-small")

    # Re-embed corpus + queries
    new_corpus = embed_with("text-embedding-3-large")
    new_queries = embed_with("text-embedding-3-large")
    new_gt = compute_ground_truth(new_corpus, new_queries)

    # Re-build vector index
    rebuild_index(new_corpus)

    # Measure
    new_recall = recall_at_k(retrieve_topk(new_queries, k=10), new_gt)
    delta = new_recall - old_recall
    # Allow up to 5% recall drop on engineering basis; flag if larger
    assert delta >= -0.05, f"Recall dropped {delta:.3f} after embedding upgrade"
```

The brute-force ground-truth is per-model. After upgrade, both
sides of the comparison change.

## Step 6 - Cross-engine baseline (ANN-Benchmarks)

Per the [ANN-Benchmarks docs], the framework "evaluates 37+ ANN
algorithms ... by plotting recall against queries per second across
various datasets" including HNSW (multiple impls), FAISS IVF, ScaNN,
Annoy, Qdrant, Weaviate, Milvus.

Run:

```bash
git clone https://github.com/erikbern/ann-benchmarks.git
cd ann-benchmarks
python install.py --algorithm hnswlib
python run.py --algorithm hnswlib --dataset glove-100-angular
python plot.py --dataset glove-100-angular
```

Outputs per-engine recall/QPS curves. Use to pick an engine + initial
parameter set.

## Step 7 - Filter tests

Vector search + filter (e.g., "find similar products WHERE price <
50") interacts in surprising ways: pre-filter shrinks the search
space (good for recall, sometimes bad for latency), post-filter
rebuilds top-k after filtering (recall drops below K).

```python
def test_filtered_search_recall():
    # Filter: only docs with category=shoes
    filter_fn = lambda doc: doc["category"] == "shoes"
    filtered_corpus = [v for v, d in zip(corpus_vectors, corpus_metadata) if filter_fn(d)]
    filtered_gt = compute_ground_truth(filtered_corpus, query_vectors)

    retrieved = engine_search(query_vectors, filter={"category": "shoes"}, k=10)
    recall = recall_at_k(retrieved, filtered_gt)
    assert recall >= 0.90
```

Pre-filter vs post-filter strategy matters per engine - see engine docs.

## Step 8 - Index rebuild vs incremental

Some engines (Qdrant, Weaviate) support online updates; others
(some FAISS configurations) require full rebuild on insert. Test:

```python
def test_recall_after_incremental_inserts():
    # Initial index
    initial_recall = recall_at_k(engine_search(queries, k=10), ground_truth)

    # Insert 10% more docs
    for v, m in new_docs:
        engine.insert(v, m)

    # Re-measure (without rebuild)
    new_recall = recall_at_k(engine_search(queries, k=10), ground_truth_extended)
    assert new_recall >= initial_recall - 0.05
```

Some engines degrade significantly without periodic rebuild - 
catch in test.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use cosine on un-normalized vectors | Distance becomes meaningless | Normalize OR use inner-product metric |
| Skip ground truth (rely on engine self-eval) | Can't catch index corruption | Brute-force ground truth (Step 1) |
| Test recall-only or latency-only | Either alone is gameable | Both per parameter (Steps 2-4) |
| Hard-code `ef=128` without sweep | Over-tuned for one query set | Sweep + pick per recall target (Step 3) |
| Reuse ground truth across embedding-model upgrades | Different vector space; nonsense recall | Recompute (Step 5) |

## Limitations

- Brute-force ground truth is O(N×Q) - feasible to ~1M docs ×
  1k queries. Beyond, sample.
- Recall@10 ≥ 0.95 is the hand-wavy default; production requirements
  vary widely (medical search vs e-commerce).
- ANN-Benchmarks uses synthetic datasets (GloVe, SIFT, GIST);
  in-domain corpora behave differently.

## References

- [ANN-Benchmarks docs] - cross-engine recall/QPS curves
- [Qdrant search docs] - `query_points` + `SearchParams(hnsw_ef=...)`,
  HNSW parameters (M, ef_construct, ef), recall vs latency tradeoff
- [Weaviate Python client docs] - v4 `near_vector` query and the
  collection-level `ef` (`Reconfigure.VectorIndex.hnsw`) config
- [`elasticsearch-relevance-tests`](../elasticsearch-relevance-tests/SKILL.md),
  [`opensearch-relevance-tests`](../opensearch-relevance-tests/SKILL.md) - 
  classic IR-metrics relevance tests for term-based retrieval

[ANN-Benchmarks docs]: https://ann-benchmarks.com/
[Qdrant search docs]: https://qdrant.tech/documentation/concepts/search/
[Weaviate Python client docs]: https://docs.weaviate.io/weaviate/client-libraries/python
