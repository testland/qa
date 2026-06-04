---
name: judgment-list-author
description: "Bootstraps human-relevance judgment lists (query sets, grading scales, rater guidelines, inter-rater agreement, Quepid tooling, TREC-style pooling, and refresh cadence) that serve as ground truth for all three search-relevance skills and the relevance-regression-reviewer agent. Use when a team needs to create or refresh the judgment corpus before running NDCG / MRR / Recall@k evaluations."
type: skill
rating: 24
d6: 4
keywords:
  - judgment-list
  - qrels
  - relevance-ground-truth
  - quepid
  - trec
  - inter-rater-agreement
  - ndcg
---

# judgment-list-author

The other skills in this plugin (`elasticsearch-relevance-tests`,
`opensearch-relevance-tests`, `vector-search-precision-tests`) and the
`relevance-regression-reviewer` agent all require a judgment list - a set of
`(query, document_id, grade)` triples that define what "relevant" means for
your product. Nothing else in this plugin creates that corpus. This skill does.

Per [TREC's pooling methodology], "NIST pools the individual results, judges
the retrieved documents for correctness, and evaluates the results" - the
judgment list is the non-automated step that all automated metrics depend on.

## When to use

- Before running `_rank_eval` or `recall@k` for the first time: no judgment
  list means no metrics.
- After a major schema or corpus change: existing judgments cover documents
  that may no longer exist or new documents that are entirely unjudged.
- When `relevance-regression-reviewer` reports > 30% unrated docs across
  queries: the judgment pool is stale.
- When adding a new query segment (new product category, new language) with
  no coverage in the existing set.

## Step 1 - Select the query set (head / torso / tail sampling)

Not all queries deserve equal judgment effort. Sample across three tiers:

| Tier | Definition | Suggested count | Priority |
|---|---|---|---|
| Head | Top ~100-500 by traffic volume (covers ~80% of impressions) | 50-100 queries | Highest |
| Torso | Queries ranked ~500-5000 (navigational, faceted) | 100-200 queries | Medium |
| Tail | Low-frequency, long-tail queries | 50-100 queries | Lower |

Pull the sample from query logs, not from intuition. Use a 90-day window to
avoid seasonal skew. Keep the raw log row for each sampled query - you will
need it to assign traffic weight when computing weighted NDCG.

A starting corpus of roughly 200-400 queries across tiers gives sufficient
coverage for NDCG-based gates. Per [Quepid docs], "100 judgments (10 pages
of 10 search results) serves as a solid foundation" for initial evaluation
projects.

## Step 2 - Choose the grading scale

Two options are widely used:

### Binary (TREC standard)

Per [TREC qrels format], the classic qrels file uses two values:
`0` (not relevant) and `1` (relevant). Simple to collect; sufficient for
Precision@k and Recall@k. Use binary when raters have low domain expertise
or when the query intent is unambiguous (navigational queries).

Qrels file format (4 columns, per [TREC qrels format]):

```text
<topic_id> <iteration> <doc_id> <relevance>
1 0 doc-abc-123 0
1 0 doc-xyz-456 1
```

The `iteration` column is "almost always zero and not used" per TREC.
Unjudged documents are assumed irrelevant in evaluation.

### Graded 0-3 (Quepid default)

Per [Quepid judgment rating best practices], the 0-3 scale maps to:

| Grade | Label | Rater cue |
|---|---|---|
| 3 | Perfect | "This is exactly what I am looking for." |
| 2 | Good | "Relevant - I want these results, but haven't found the exact one yet." |
| 1 | Fair | "I see the connection, but these are not what I am looking for." |
| 0 | Poor | "These are terrible - I would search elsewhere." |

Use graded when you need NDCG or DCG (metrics that reward highly relevant
results at higher ranks). Required by `elasticsearch-relevance-tests` Step 1
which uses a 4-point (0-3) scale.

## Step 3 - Write grading guidelines for raters

Grading guidelines prevent scale drift between raters and across time. A
minimal guidelines document covers:

1. **Task definition:** state the user's information need, not just the
   query string. "query: running shoes" could be navigational (find Nike
   page) or informational (compare models).
2. **Grade anchors with examples:** for each grade level, list 2-3 concrete
   examples from your domain. Raters calibrate to examples faster than
   to prose definitions.
3. **Edge cases by domain:** e-commerce (out-of-stock items, variant SKUs),
   docs search (older versions, deprecated APIs), support search
   (resolved vs open tickets).
4. **What to do with unrateable documents:** Quepid supports an `unrateable`
   flag per [Quepid API] (`unrateable: boolean`). Use it for documents where
   the rater cannot determine relevance (e.g. page behind a login wall).

Store the guidelines in version control alongside the judgment file. When
guidelines change, treat it as a new judgment round - old and new grades
are not comparable.

## Step 4 - Set up Quepid for rater workflow

[Quepid] (github.com/o19s/quepid) is the standard open-source tool for
collaborative judgment authoring. It runs as a self-hosted Rails app and
connects to Elasticsearch, OpenSearch, Solr, Algolia, and other backends.

Setup flow:

1. Deploy Quepid via Docker: `docker-compose up` per the Quepid README.
2. Create a **Case** - one Case = one judgment corpus for one search
   endpoint + query set.
3. Import queries (CSV or manual entry). Each query gets a displayed
   information-need description shown to the rater.
4. Assign raters. Quepid tracks `user_id` per judgment per [Quepid API],
   enabling per-rater analysis.
5. Raters work through the **Human Rating Interface**: query + information
   need + rendered document + grade selector.
6. Export when done. Per [Quepid API], the export is a CSV with headers
   `query_text, doc_id, <judge_1_name>, <judge_2_name>, ...` and filename
   `book_{id}_judgements.csv`. JSON and Learning-to-Rank formats are also
   supported per [Quepid docs].

For teams without Quepid, a spreadsheet works for small sets (under 500
judgments): columns `query_id, query_text, doc_id, grade, rater_id, notes`.
Convert to qrels format before feeding `_rank_eval`.

## Step 5 - Measure inter-rater agreement (Cohen's kappa)

Have at least two independent raters judge the same 10-20% overlap set.
Compute Cohen's kappa to verify the scale is being applied consistently.

Formula per [Cohen's kappa, Wikipedia]:

```
kappa = (p_o - p_e) / (1 - p_e)
```

where `p_o` is observed agreement and `p_e` is expected chance agreement.

Interpretation thresholds (Landis and Koch, 1977, as cited in [Cohen's
kappa, Wikipedia]):

| Kappa | Agreement |
|---|---|
| < 0.20 | Slight - raters are guessing; revise guidelines |
| 0.21-0.40 | Fair - guidelines unclear; calibrate with examples |
| 0.41-0.60 | Moderate - acceptable for exploratory work |
| 0.61-0.80 | Substantial - good for production gates |
| 0.81-1.00 | Almost perfect - target for high-stakes domains |

For binary judgments, kappa < 0.60 means your guidelines are ambiguous.
Rewrite the edge-case section, run a calibration session with raters, and
re-judge the overlap set before proceeding.

```python
from sklearn.metrics import cohen_kappa_score

rater_a = [3, 2, 1, 0, 3, 2, 2, 1, 0, 3]
rater_b = [3, 2, 0, 0, 3, 1, 2, 1, 0, 2]

kappa = cohen_kappa_score(rater_a, rater_b)
print(f"Cohen's kappa: {kappa:.3f}")
# 0.61-0.80 = substantial agreement; proceed to full rating round
```

When multiple raters cover non-overlapping document sets (common for large
judgment pools), use Krippendorff's alpha instead - it handles missing data
across raters.

## Step 6 - Pool from multiple retrieval systems

When you have results from more than one system (e.g. current BM25 +
candidate neural re-ranker), use TREC-style depth-k pooling to maximize
judgment coverage.

Per [TREC pooling, Wikipedia], the method "aggregates the top-ranked n
documents from each participating system's results, creating a manageable
subset for comprehensive judgment."

Practical pooling:

```python
def pool_results(system_results: dict[str, list[str]], depth: int = 10) -> set[str]:
    """
    system_results: { system_name: [doc_id, ...] } top-depth per query
    Returns the union of all doc IDs in the pool.
    """
    pool = set()
    for docs in system_results.values():
        pool.update(docs[:depth])
    return pool
```

Pool depth = 10 is standard for small collections (< 100k docs). Increase
to 20-50 when you have > 3 candidate systems to avoid missing relevant
documents that only appear in one system's lower ranks.

Documents outside the pool are unjudged. Per [TREC qrels format], unjudged
documents are treated as irrelevant in metric computation. This is
conservative but consistent across systems.

## Step 7 - Establish refresh cadence

Judgment lists go stale when the document corpus changes substantially.
Define explicit refresh triggers:

| Trigger | Action |
|---|---|
| Index schema change (new field, new analyzer) | Full re-pool + partial re-judge (re-rate 20% overlap) |
| Embedding model upgrade | Full re-pool for all affected query tiers |
| Corpus grows > 20% | Re-pool; re-judge new documents only |
| `relevance-regression-reviewer` flags > 30% unrated | Partial re-judge: new docs in the unrated set |
| New product category / language added | Add new query stratum; judge from scratch for that stratum |

As a minimum, run a lightweight staleness check monthly: for each query,
count the `unrated_docs` fraction in `_rank_eval` results. If the average
exceeds 20%, schedule a re-judging session.

## Output format

The judgment list consumed by `elasticsearch-relevance-tests`,
`opensearch-relevance-tests`, and `relevance-regression-reviewer` is a
JSON array:

```json
[
  {
    "query_id": "q001",
    "query": "running shoes",
    "ratings": [
      { "doc_id": "doc-abc", "rating": 3 },
      { "doc_id": "doc-xyz", "rating": 1 },
      { "doc_id": "doc-mno", "rating": 0 }
    ]
  }
]
```

Or equivalently as a TREC qrels file (4 columns) for binary cases, which
tools like `trec_eval` and the Elasticsearch `_rank_eval` API both accept
after mapping `doc_id` to the index's `_id` field.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Judge only the current system's top-10 | Biases the corpus toward the incumbent; new systems retrieve different docs | Pool from all candidate systems (Step 6) |
| One rater, no kappa check | Silent scale drift; metrics become meaningless over time | Require 10-20% overlap + kappa >= 0.60 (Step 5) |
| Reuse judgments after embedding model upgrade | Vector space changed; doc rankings shift entirely | Re-pool and re-judge after any embedding change |
| Judge head queries only | Tail queries drive long-tail revenue; regressions go undetected | Sample across head/torso/tail (Step 1) |
| Treat unjudged docs as relevant | Inflates recall metrics artificially | Default unjudged to irrelevant per TREC convention |
| No version control on guidelines | Raters from two periods use different scales; grades are incompatible | Store guidelines in git; treat guideline changes as a new round |

## Limitations

- TREC pooling assumes multiple competing systems. Single-system shops
  have shallower pools and higher unjudged-doc rates.
- Graded 0-3 scale requires domain-expert raters. Binary scale is
  appropriate when domain expertise is scarce.
- Cohen's kappa understates agreement on rare categories (e.g. grade 3
  "perfect" is rare for tail queries). Per [Cohen's kappa, Wikipedia],
  supplement with per-grade agreement counts when the kappa is borderline.
- Judgment effort scales with query count and pool depth. A 400-query set
  at depth 20 = 8,000 documents to judge; plan rater time accordingly.

## References

- [TREC qrels format] - 4-column qrels file format, binary relevance scale,
  pooling convention: https://trec.nist.gov/data/qrels_eng.html
- [TREC pooling, Wikipedia] - depth-k pooling methodology:
  https://en.wikipedia.org/wiki/Text_Retrieval_Conference
- [Quepid] - open-source judgment authoring tool (Rails, supports ES /
  OpenSearch / Solr / Algolia): https://github.com/o19s/quepid
- [Quepid judgment rating best practices] - 0-3 grade scale (Poor / Fair /
  Good / Perfect) with per-grade rater cues:
  https://github.com/o19s/quepid/wiki/Judgement-Rating-Best-Practices
- [Quepid docs] - rater workflow, 100-judgment baseline, export formats
  (CSV / JSON / LTR): https://quepid-docs.dev.o19s.com/2/quepid
- [Quepid API] - judgment fields (`rating`, `unrateable`, `judge_later`,
  `explanation`), CSV export structure `book_{id}_judgements.csv`:
  https://github.com/o19s/quepid/blob/main/app/controllers/api/v1/judgements_controller.rb
- [Cohen's kappa, Wikipedia] - kappa formula, Landis and Koch (1977)
  thresholds: https://en.wikipedia.org/wiki/Cohen%27s_kappa
- [`elasticsearch-relevance-tests`](../elasticsearch-relevance-tests/SKILL.md) -
  consumes judgment lists for `_rank_eval`
- [`opensearch-relevance-tests`](../opensearch-relevance-tests/SKILL.md) -
  consumes judgment lists for OpenSearch rank eval
- [`vector-search-precision-tests`](../vector-search-precision-tests/SKILL.md) -
  consumes judgment lists for recall@k evaluation
- [`relevance-regression-reviewer`](../../agents/relevance-regression-reviewer.md) -
  reviewer that requires a judgment list as input
