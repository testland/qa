---
name: solr-relevance-tests
description: "Tests Apache Solr search relevance by querying a test core, asserting ranking and score expectations, uploading LTR feature stores and models via the `/schema/feature-store` and `/schema/model-store` REST APIs, using `debugQuery` for per-document score explain, tuning eDisMax parameters (`qf`, `pf`, `mm`, `bq`), and computing judgment-driven nDCG checks against pinned corpora. Use when the search stack runs Apache Solr (enterprise, SolrCloud, or embedded) and you need a pre-deploy relevance gate or LTR model verification."
type: skill
rating: 23
d6: 4
keywords:
  - solr
  - relevance-testing
  - learning-to-rank
  - edismax
  - judgment-list
  - search-quality
  - ltr
  - ndcg
---

# solr-relevance-tests

Apache Solr is the primary Elasticsearch/OpenSearch alternative in enterprise
search. Unlike the ES/OS `_rank_eval` endpoint, Solr has no single built-in
IR-metrics endpoint: relevance testing is assembled from `debugQuery` score
explain, the Learning To Rank (LTR) contrib module, eDisMax tuning, and a
test harness that computes nDCG externally. This skill covers that assembly.

Nearest neighbors and differentiation:

| Skill | Engine | Differentiation axis |
|---|---|---|
| `elasticsearch-relevance-tests` | Elasticsearch | Built-in `_rank_eval` endpoint; no LTR store API |
| `opensearch-relevance-tests` | OpenSearch | ES-fork + neural search; different LTR surface |
| **`solr-relevance-tests`** | Apache Solr | `debugQuery` explain, LTR feature/model store REST, eDisMax `qf`/`pf`/`mm` tuning |

## When to use

- Production stack runs Apache Solr (standalone or SolrCloud) and you need
  a pre-deploy gate before changing query config, schema, or analyzers.
- A trained LTR model (LambdaMART, LinearModel, NeuralNetwork) must be
  verified to improve or preserve nDCG before promotion.
- eDisMax field weights (`qf`) or phrase boosts (`pf`) were edited and you
  need to confirm no per-query regression.
- Score explain output shows an unexpected ranking and you need to reproduce
  + assert it in a test.

## Step 1 - Start a test core

Per the [Solr CLI reference]:

```bash
bin/solr start -p 8983
bin/solr create -c test_products -d _default
```

Index a snapshot of your production corpus (or a representative subset).
Freeze the index before running any judgment-driven tests - new documents
shift relevance baselines silently.

## Step 2 - Build the judgment list

Same 4-point scale as `elasticsearch-relevance-tests`:
0 = irrelevant, 1 = somewhat, 2 = relevant, 3 = highly relevant.

```csv
query,doc_id,rating
"running shoes",SKU-1234,3
"running shoes",SKU-5678,2
"running shoes",SKU-9999,0
"red dress",SKU-2222,3
```

Collect judgments via query logs + click data, domain SME review, or
[Quepid](https://github.com/o19s/quepid) (open source judgment UI with
Solr support).

## Step 3 - Query and collect ranked results

Solr has no `_rank_eval` equivalent. Call the query endpoint and collect
ranked doc IDs per query:

```python
import requests

SOLR = "http://localhost:8983/solr/test_products"

def ranked_ids(query: str, rows: int = 10) -> list[str]:
    r = requests.get(f"{SOLR}/select", params={
        "q": query,
        "defType": "edismax",
        "qf": "title^5.0 description^1.0",
        "rows": rows,
        "fl": "id,score",
    })
    return [doc["id"] for doc in r.json()["response"]["docs"]]
```

## Step 4 - Compute nDCG externally

```python
import csv, math

def load_judgments(path: str) -> dict[str, dict[str, int]]:
    j: dict[str, dict[str, int]] = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            j.setdefault(row["query"], {})[row["doc_id"]] = int(row["rating"])
    return j

def dcg(ratings: list[int]) -> float:
    return sum(r / math.log2(i + 2) for i, r in enumerate(ratings))

def ndcg_at_k(query: str, doc_ids: list[str],
              judgments: dict[str, int], k: int = 10) -> float:
    ranked = [judgments.get(d, 0) for d in doc_ids[:k]]
    ideal = sorted(judgments.values(), reverse=True)[:k]
    idcg = dcg(ideal)
    return dcg(ranked) / idcg if idcg > 0 else 0.0

def test_ndcg_baseline():
    judgments = load_judgments("tests/judgments.csv")
    scores = {}
    for query, rels in judgments.items():
        ids = ranked_ids(query)
        scores[query] = ndcg_at_k(query, ids, rels)
    mean = sum(scores.values()) / len(scores)
    assert mean >= 0.75, f"Mean nDCG@10 regressed: {mean:.3f}"
```

## Step 5 - Per-query regression guard

```python
import json
from pathlib import Path

def test_no_query_drops_more_than_10_percent():
    baseline = json.loads(Path("tests/solr_baseline.json").read_text())
    judgments = load_judgments("tests/judgments.csv")
    for query, rels in judgments.items():
        current = ndcg_at_k(query, ranked_ids(query), rels)
        b = baseline[query]
        delta = current - b
        assert delta >= -0.10, (
            f"Query '{query}' dropped {delta:.3f} "
            f"(was {b:.3f}, now {current:.3f})"
        )
```

Save a new baseline after any intentional improvement:

```bash
python3 tests/capture_baseline.py > tests/solr_baseline.json
```

## Step 6 - debugQuery for score explain

Per the [Solr debugQuery reference], append `debug=results&debug.explain.structured=true`
to receive a nested score breakdown per document:

```python
def explain_top(query: str, rows: int = 5) -> dict:
    r = requests.get(f"{SOLR}/select", params={
        "q": query,
        "defType": "edismax",
        "qf": "title^5.0 description^1.0",
        "rows": rows,
        "debug": "results",
        "debug.explain.structured": "true",
    })
    return r.json()["debug"]["explain"]

def test_top_doc_score_above_threshold():
    explain = explain_top("running shoes")
    top_id = next(iter(explain))
    score = explain[top_id]["value"]
    assert score >= 5.0, f"Top document score {score:.2f} below expected floor"
```

Use `explainOther` (per the [Solr debugQuery reference]) to compare scoring
of an expected document against the actual top results:

```
?q=running+shoes&explainOther=id:SKU-1234&debug=results
```

This surfaces why `SKU-1234` ranked lower than expected.

## Step 7 - eDisMax tuning verification

Per the [Solr eDisMax reference], the key parameters affecting relevance are:

| Parameter | Effect |
|---|---|
| `qf` | Field weights: `title^5.0 description^1.0` |
| `pf` | Phrase proximity boost when all terms appear together |
| `mm` | Minimum-should-match: `75%` requires 3 of 4 terms |
| `bq` | Additive boost query: `bq=category:shoes^2.0` |
| `bf` | Additive function boost: `bf=recip(rord(price),1,1000,1000)` |
| `tie` | Tie-breaker across `qf` fields (default 0.0) |
| `ps` | Phrase slop: `ps=3` allows 3 intervening words |

Pin the eDisMax config in tests so a config file change is caught before
deploy:

```python
EDISMAX_PARAMS = {
    "defType": "edismax",
    "qf": "title^5.0 description^1.0 brand^3.0",
    "pf": "title^10.0",
    "mm": "75%",
    "tie": "0.1",
}

def test_edismax_params_unchanged():
    # Fails if the live handler returns different defaults
    r = requests.get(f"{SOLR}/config/requestHandler",
                     params={"componentName": "/select"})
    handler = r.json()["config"]["requestHandler"]["/select"]
    defaults = handler.get("defaults", {})
    for key, expected in EDISMAX_PARAMS.items():
        assert defaults.get(key) == expected, (
            f"eDisMax param '{key}' changed: expected {expected!r}, "
            f"got {defaults.get(key)!r}"
        )
```

## Step 8 - LTR feature store upload and verification

Per the [Solr LTR reference], the feature store REST API:

```bash
# Upload features
curl -XPUT 'http://localhost:8983/solr/test_products/schema/feature-store' \
  --data-binary "@tests/ltr/features.json" \
  -H 'Content-type:application/json'

# Verify store contents
curl 'http://localhost:8983/solr/test_products/schema/feature-store/_DEFAULT_'
```

Minimal `features.json` with a field-value feature and a recency function:

```json
[
  {
    "name": "titleMatch",
    "class": "org.apache.solr.ltr.feature.SolrFeature",
    "params": { "q": "title:(${query})" }
  },
  {
    "name": "recency",
    "class": "org.apache.solr.ltr.feature.FieldValueFeature",
    "params": { "field": "published_date" }
  }
]
```

```python
def test_feature_store_uploaded():
    r = requests.get(
        f"{SOLR}/schema/feature-store/_DEFAULT_"
    )
    names = {f["name"] for f in r.json()["features"]}
    assert "titleMatch" in names
    assert "recency" in names
```

## Step 9 - LTR model upload and re-ranking test

Per the [Solr LTR reference], upload a `MultipleAdditiveTreesModel` (LambdaMART):

```bash
curl -XPUT 'http://localhost:8983/solr/test_products/schema/model-store' \
  --data-binary "@tests/ltr/lambdamart_v1.json" \
  -H 'Content-type:application/json'
```

Then assert the LTR re-ranked list improves nDCG vs the baseline BM25 list.
Per the [Solr LTR reference], the `rq` parameter with `reRankDocs` controls
how many top BM25 candidates are re-scored:

```python
def ranked_ids_ltr(query: str, rows: int = 10,
                   rerank_docs: int = 100) -> list[str]:
    r = requests.get(f"{SOLR}/select", params={
        "q": query,
        "defType": "edismax",
        "qf": "title^5.0 description^1.0",
        "rq": "{!ltr model=lambdamart_v1 reRankDocs=" + str(rerank_docs) + "}",
        "rows": rows,
        "fl": "id,score,[features]",
    })
    return [doc["id"] for doc in r.json()["response"]["docs"]]

def test_ltr_improves_ndcg():
    judgments = load_judgments("tests/judgments.csv")
    bm25_scores, ltr_scores = {}, {}
    for query, rels in judgments.items():
        bm25_scores[query] = ndcg_at_k(query, ranked_ids(query), rels)
        ltr_scores[query] = ndcg_at_k(query, ranked_ids_ltr(query), rels)
    bm25_mean = sum(bm25_scores.values()) / len(bm25_scores)
    ltr_mean = sum(ltr_scores.values()) / len(ltr_scores)
    assert ltr_mean >= bm25_mean, (
        f"LTR model did not improve nDCG: BM25={bm25_mean:.3f}, LTR={ltr_mean:.3f}"
    )
```

## Step 10 - CI integration

```yaml
# .github/workflows/solr-relevance.yml
jobs:
  relevance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start Solr
        run: |
          bin/solr start -p 8983
          bin/solr create -c test_products -d _default
      - name: Index test corpus
        run: python3 tests/index_corpus.py
      - name: Upload LTR feature store
        run: |
          curl -XPUT 'http://localhost:8983/solr/test_products/schema/feature-store' \
            --data-binary "@tests/ltr/features.json" \
            -H 'Content-type:application/json'
      - name: Upload LTR model
        run: |
          curl -XPUT 'http://localhost:8983/solr/test_products/schema/model-store' \
            --data-binary "@tests/ltr/lambdamart_v1.json" \
            -H 'Content-type:application/json'
      - name: Run relevance tests
        run: pytest tests/ -v --tb=short
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mutable test core | Index changes shift baselines between runs | Snapshot + restore before each CI run |
| Only asserting aggregate nDCG | Per-query regressions hide in the mean | Per-query guard (Step 5) |
| LTR model tested without BM25 baseline | Improvement is unmeasurable | Capture BM25 nDCG first, then compare (Step 9) |
| Fetching `debugQuery` output without `debug.explain.structured=true` | String parse is fragile across Solr versions | Always use structured explain |
| Uploading model before feature store | Model references features that don't exist yet | Features first, model second (Steps 8-9) |
| Hard-coded `reRankDocs=10` | Candidate pool too small; LTR can't reorder enough docs | Set `reRankDocs` to at least 3x the result page size |

## Limitations

- Solr has no native IR-metrics API (`_rank_eval` equivalent); nDCG must be
  computed in the test harness. ES/OS teams may prefer the built-in API.
- LTR requires the `ltr` contrib module enabled in `solrconfig.xml` and the
  `featureVectorCache` configured. Missing config silently disables re-ranking.
- Large LTR models (deep tree ensembles) may exceed ZooKeeper's buffer limits
  in SolrCloud; use `DefaultWrapperModel` with an external resource reference
  (per the [Solr LTR reference]).
- Click-derived judgments carry position bias; correct using click models
  before using them as ground truth.

## References

- [Solr LTR reference]: https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html
- [Solr debugQuery reference]: https://solr.apache.org/guide/solr/latest/query-guide/common-query-parameters.html
- [Solr eDisMax reference]: https://solr.apache.org/guide/solr/latest/query-guide/edismax-query-parser.html
- [Solr CLI reference]: https://solr.apache.org/guide/solr/latest/deployment-guide/solr-control-script-reference.html
- [`elasticsearch-relevance-tests`](../elasticsearch-relevance-tests/SKILL.md) - sister skill (built-in `_rank_eval`)
- [`opensearch-relevance-tests`](../opensearch-relevance-tests/SKILL.md) - ES-fork with neural search
- [`vector-search-precision-tests`](../vector-search-precision-tests/SKILL.md) - vector/dense retrieval analogue
- [Quepid](https://github.com/o19s/quepid) - judgment authoring UI with Solr support

[Solr LTR reference]: https://solr.apache.org/guide/solr/latest/query-guide/learning-to-rank.html
[Solr debugQuery reference]: https://solr.apache.org/guide/solr/latest/query-guide/common-query-parameters.html
[Solr eDisMax reference]: https://solr.apache.org/guide/solr/latest/query-guide/edismax-query-parser.html
[Solr CLI reference]: https://solr.apache.org/guide/solr/latest/deployment-guide/solr-control-script-reference.html
