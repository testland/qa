# qa-search-relevance

IR-metrics-driven search relevance testing - judgment lists, NDCG /
MRR / Recall@k, vector recall@k vs latency Pareto curve. Three
skills + one reviewer agent that synthesizes per-query regression
analysis across term-based and vector search.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [elasticsearch-relevance-tests](skills/elasticsearch-relevance-tests/SKILL.md) | `_rank_eval` API; judgment lists; metrics (Precision@K, Recall@K, MRR, DCG/NDCG, ERR); per-query regression detection; Quepid + Splainer integration |
| Skill | [opensearch-relevance-tests](skills/opensearch-relevance-tests/SKILL.md) | Search Relevance Workbench; reuse ES judgment format; neural query DSL; hybrid (BM25 + neural) ranking + pipeline weighting; ES → OS migration parity |
| Skill | [vector-search-precision-tests](skills/vector-search-precision-tests/SKILL.md) | Brute-force ground truth; recall@k vs latency Pareto; HNSW M / ef_construct / ef sweep; embedding-model-upgrade drift; ANN-Benchmarks framework |
| Agent | [relevance-regression-reviewer](agents/relevance-regression-reviewer.md) | Adversarial reviewer; per-query regression detection; refuses when head queries drop > 0.05 OR when judgments are stale (> 50% unrated) |
| Skill | [solr-relevance-tests](skills/solr-relevance-tests/SKILL.md) | Apache Solr relevance testing: LTR, debugQuery score explain, edismax tuning, nDCG checks. |
| Skill | [judgment-list-author](skills/judgment-list-author/SKILL.md) | Bootstrap human-judgment ground-truth lists: query sampling, grading scales, kappa, Quepid, pooling. |
| Skill | [hybrid-search-eval-author](skills/hybrid-search-eval-author/SKILL.md) | Evaluate hybrid retrieval (BM25 + vector + reranker) with RRF fusion and nDCG/MRR. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-search-relevance@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
