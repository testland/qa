# qa-search-relevance

IR-metrics-driven search relevance testing - judgment lists, NDCG /
MRR / Recall@k, vector recall@k vs latency Pareto curve. Four
skills + one reviewer agent that synthesizes per-query regression
analysis across term-based and vector search.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [elasticsearch-relevance-tests](skills/elasticsearch-relevance-tests/SKILL.md) | Engine umbrella for Elasticsearch, OpenSearch, and Apache Solr: `_rank_eval` API; judgment lists; metrics (Precision@K, Recall@K, MRR, DCG/NDCG, ERR); per-query regression detection; Quepid + Splainer integration; per-engine references for the OpenSearch delta (Workbench, neural, hybrid, migration parity) and the Solr delta (LTR, debugQuery, eDisMax, external nDCG) |
| Skill | [vector-search-recall-tests](skills/vector-search-recall-tests/SKILL.md) | Brute-force ground truth; recall@k vs latency Pareto; HNSW M / ef_construct / ef sweep; embedding-model-upgrade drift; ANN-Benchmarks framework |
| Skill | [judgment-list-author](skills/judgment-list-author/SKILL.md) | Bootstrap human-judgment ground-truth lists: query sampling, grading scales, kappa, Quepid, pooling. |
| Skill | [hybrid-search-eval-author](skills/hybrid-search-eval-author/SKILL.md) | Evaluate hybrid retrieval (BM25 + vector + reranker) with RRF fusion and nDCG/MRR. |
| Agent | [relevance-regression-reviewer](agents/relevance-regression-reviewer.md) | Adversarial reviewer; per-query regression detection; refuses when head queries drop > 0.05 OR when judgments are stale (> 50% unrated) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-search-relevance@testland-qa
```
