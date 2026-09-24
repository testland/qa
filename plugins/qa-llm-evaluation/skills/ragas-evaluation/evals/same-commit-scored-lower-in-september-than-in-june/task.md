# A tag we froze in June does not produce June's numbers any more

## Problem Description

Our documentation assistant has a gate with four numbers on it. The thresholds
were set on 2026-06-04 from a run on commit `a91f3c2`, which we tagged, and the
gate was green until three weeks ago when it started going red on unrelated
pull requests.

On 2026-09-10 an engineer checked out that exact tag and re-ran the gate on it,
expecting the June numbers back as a sanity check. He got lower numbers on
every one of the four. Same commit, same golden set, same prompts, same
retriever code.

There is a third run. On 2026-09-02 the same engineer had already re-run the
tag with a wheelhouse we keep cached from the spring, so the Python packages
were June's, and he saved that output too. All three runs are in the attached
comparison. The raw job logs from all three are attached as well, along with
the dependency listings, a per-row artifact for one of the four metrics, the
index manifests from either side of the August rebuild, and our change log.

What I want out of this is that a year from now somebody can check out a tag
and get the same numbers off it. Right now we plainly cannot, and I would like
each of the four movements accounted for separately rather than lumped together
as "things drift".

Two things are being proposed and I want a straight verdict on each.

The first is to take today's numbers as the new baseline, set the thresholds
under them and move on, on the argument that the code has not changed so the
quality has not changed and the thresholds are simply stale. The person
proposing it has been here a lot longer than I have and I cannot find the hole
in it.

The second is Marta's branch `spike/deterministic-gate`, and I find it hard to
argue with. She points out that every one of our four numbers comes out of a
judge model we do not control and which changes under us, which is exactly the
thing that has burned us here. Her branch replaces the four with metrics the
library ships that compute from the text directly and never call a judge at
all. She has run the tag through it three times and the numbers are identical
to four decimal places every time, which is more than our current gate has ever
managed. Her write-up is attached, and so is a read-through the docs team did
of a batch of golden rows a fortnight before her branch existed. If this gets
me a tag that reproduces, I am inclined to take it.

## Output Specification

1. Edit `requirements.txt`, `.github/workflows/eval.yml` and `eval/run.py` so
   that a re-run of a tagged commit produces comparable numbers.
2. Edit `eval/thresholds.yaml` only where the evidence in the attached
   comparison supports moving a threshold, and say in the file why. Leave the
   rest alone.
3. Write `docs/baseline-drift.md`: an account of each of the four movements and
   the evidence separating it from the others, a granted-or-refused verdict on
   both proposals with the reason, and what has to happen before any threshold
   is re-set.

## Input Files

Extract the following files before beginning.

=============== FILE: requirements.txt ===============
ragas
openai
datasets
pyyaml

=============== FILE: eval/run.py ===============
import pathlib

import yaml
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)

ROOT = pathlib.Path(__file__).resolve().parents[1]
GATED = [faithfulness, answer_relevancy, context_recall, context_precision]


def main(golden, thresholds):
    floors = yaml.safe_load(pathlib.Path(thresholds).read_text(encoding="utf-8"))
    result = evaluate(Dataset.from_json(golden), metrics=GATED)
    print(result)
    for name, floor in floors.items():
        assert result[name] >= floor, f"{name} {result[name]:.2f} < {floor}"

=============== FILE: .github/workflows/eval.yml ===============
name: docs-assistant-eval

on:
  pull_request:
  workflow_dispatch:

jobs:
  eval:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python -m eval.run --golden data/golden.jsonl --thresholds eval/thresholds.yaml
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          JUDGE_MODEL: gpt-4o

=============== FILE: eval/thresholds.yaml ===============
# Baselined 2026-06-04 from commit a91f3c2. Floors set 2 points under the
# observed run.
faithfulness: 0.92
answer_relevancy: 0.89
context_recall: 0.87
context_precision: 0.81

=============== FILE: reports/june-vs-september.md ===============
# Three runs of commit a91f3c2, same 80-row golden set

| Run                                   | faithfulness | answer_relevancy | context_recall | context_precision |
|---------------------------------------|--------------|------------------|----------------|-------------------|
| 2026-06-04, June job                   | 0.94         | 0.91             | 0.89           | 0.83              |
| 2026-09-02, June wheelhouse restored   | 0.94         | 0.90             | 0.84           | 0.83              |
| 2026-09-10, current job                | 0.86         | 0.88             | 0.79           | 0.81              |

Thresholds in force: 0.92 / 0.89 / 0.87 / 0.81. The 09-10 run fails three of
the four. The 09-02 run fails one.

The golden set is 40 rows against the API reference and 40 against the
changelog. A per-row artifact was saved for context_recall only;
`artifacts/recall-by-row.csv` is a twenty-row sample of it.

Three rows produced a different score on 09-10 than on 09-02 while the
retrieved passages logged for them were byte-identical.

=============== FILE: artifacts/job-log-june.txt ===============
2026-06-04T02:11:09Z  eval start  commit a91f3c2  golden 80 rows
2026-06-04T02:11:09Z  python 3.12.4  runner ubuntu-22.04
2026-06-04T02:11:10Z  resolved metrics: Faithfulness, AnswerRelevancy, ContextRecall, ContextPrecisionWithReference
2026-06-04T02:11:10Z  judge: gpt-4o -> gpt-4o-2024-05-13
2026-06-04T02:11:10Z  index: api-reference 4100 chunks, changelog 610 chunks
2026-06-04T02:29:44Z  faithfulness 0.94  answer_relevancy 0.91  context_recall 0.89  context_precision 0.83
2026-06-04T02:29:44Z  PASS

=============== FILE: artifacts/job-log-september-control.txt ===============
2026-09-02T14:20:02Z  eval start  commit a91f3c2  golden 80 rows
2026-09-02T14:20:02Z  python 3.12.4  runner ubuntu-22.04
2026-09-02T14:20:02Z  wheelhouse: artifacts/wheels-2026-06 restored, pip install --no-index
2026-09-02T14:20:03Z  resolved metrics: Faithfulness, AnswerRelevancy, ContextRecall, ContextPrecisionWithReference
2026-09-02T14:20:03Z  judge: gpt-4o -> gpt-4o-2024-11-20
2026-09-02T14:20:03Z  index: api-reference 4100 chunks, changelog 1840 chunks
2026-09-02T14:38:55Z  faithfulness 0.94  answer_relevancy 0.90  context_recall 0.84  context_precision 0.83
2026-09-02T14:38:55Z  FAIL context_recall 0.84 < 0.87

=============== FILE: artifacts/job-log-september.txt ===============
2026-09-10T09:02:51Z  eval start  commit a91f3c2  golden 80 rows
2026-09-10T09:02:51Z  python 3.12.4  runner ubuntu-22.04
2026-09-10T09:02:52Z  resolved metrics: Faithfulness, ResponseRelevancy, LLMContextRecall, LLMContextPrecisionWithoutReference
2026-09-10T09:02:52Z  DeprecationWarning: answer_relevancy is an alias for ResponseRelevancy
2026-09-10T09:02:52Z  judge: gpt-4o -> gpt-4o-2024-11-20
2026-09-10T09:02:52Z  index: api-reference 4100 chunks, changelog 1840 chunks
2026-09-10T09:41:18Z  faithfulness 0.86  answer_relevancy 0.88  context_recall 0.79  context_precision 0.81
2026-09-10T09:41:18Z  FAIL faithfulness 0.86 < 0.92; answer_relevancy 0.88 < 0.89; context_recall 0.79 < 0.87

=============== FILE: artifacts/recall-by-row.csv ===============
id,collection,recall_0604,recall_0902,recall_0910
g-004,api-reference,1.0,1.0,1.0
g-041,changelog,1.0,0.5,0.5
g-017,api-reference,1.0,1.0,0.5
g-058,changelog,1.0,0.5,0.0
g-023,api-reference,0.5,0.5,0.5
g-072,changelog,1.0,1.0,0.5
g-031,api-reference,1.0,1.0,1.0
g-085,changelog,0.5,0.0,0.0
g-038,api-reference,1.0,1.0,0.5
g-091,changelog,1.0,1.0,1.0
g-046,api-reference,1.0,1.0,1.0
g-103,changelog,1.0,0.5,0.5
g-052,api-reference,0.5,0.5,0.5
g-118,changelog,1.0,1.0,0.5
g-062,api-reference,1.0,1.0,1.0
g-127,changelog,0.5,0.5,0.0
g-069,api-reference,1.0,1.0,1.0
g-134,changelog,1.0,0.5,0.5
g-077,api-reference,1.0,1.0,1.0
g-149,changelog,1.0,1.0,1.0

=============== FILE: artifacts/pip-freeze-june.txt ===============
datasets==2.21.0
openai==1.40.2
pandas==2.2.2
pyyaml==6.0.1
ragas==0.2.9

=============== FILE: artifacts/pip-freeze-september.txt ===============
datasets==3.0.1
openai==1.61.0
pandas==2.2.3
pyyaml==6.0.2
ragas==0.3.4

=============== FILE: artifacts/index-manifest-july.json ===============
{
  "built": "2026-07-02",
  "embedding_model": "text-embedding-3-large",
  "collections": [
    { "name": "api-reference", "chunk_words": 220, "overlap_words": 40, "chunks": 4100 },
    { "name": "changelog", "chunk_words": 900, "overlap_words": 40, "chunks": 610 }
  ]
}

=============== FILE: artifacts/index-manifest-september.json ===============
{
  "built": "2026-08-30",
  "embedding_model": "text-embedding-3-large",
  "collections": [
    { "name": "api-reference", "chunk_words": 220, "overlap_words": 20, "chunks": 4100 },
    { "name": "changelog", "chunk_words": 300, "overlap_words": 20, "chunks": 1840 }
  ]
}

=============== FILE: docs/change-log.md ===============
# Docs assistant, summer 2026

- **2026-06-04** Gate thresholds baselined from commit a91f3c2.
- **2026-07-11** Golden set frozen at 80 rows. No change since.
- **2026-08-30** Vector index rebuilt, ticket infra-4471. Manifests from either
  side of the rebuild are saved under `artifacts/`.
- **2026-09-02** Tag re-run against the cached spring wheelhouse.
- **2026-09-10** Tag re-run against the current job.

No application code, prompt or retriever change has landed on the assistant
since 2026-06-04. The tag is the same commit in all three runs.

=============== FILE: branches/deterministic-gate.md ===============
# Branch `spike/deterministic-gate` - M. Oyelaran, 2026-09-11

## The argument

Every number on our gate today is produced by asking a judge model a question.
We do not own that model, we cannot see inside it, and it is the thing that
moved under us between June and September. A gate whose readings depend on a
third party's weights is not a gate, it is a weather report.

The library ships metrics that never call a judge. They compare the answer text
against the reference answer directly - n-gram overlap, longest common
subsequence, character-level overlap, string distance. No model, no API key, no
cost, no drift.

## What the branch does

Replaces the four judged metrics with four text-comparison metrics. Same 80
golden rows, same runner.

| Run of tag a91f3c2 | overlap-A | overlap-B | char-overlap | string-distance |
|--------------------|-----------|-----------|--------------|-----------------|
| 2026-09-11, 09:14  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-11, 13:40  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-12, 08:05  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |

Identical to four decimals, three runs, two days apart. Our current gate has
never repeated a number twice.

## Per-row overlap-A, for the rows I happened to print

| Row   | overlap-A |
|-------|-----------|
| g-004 | 0.91      |
| g-017 | 0.29      |
| g-041 | 0.94      |
| g-058 | 0.88      |
| g-062 | 0.41      |
| g-072 | 0.86      |
| g-091 | 0.35      |
| g-103 | 0.77      |

I have not picked a floor yet. Open to suggestions on where to set it.

=============== FILE: reports/docs-team-readthrough.md ===============
# Docs team read-through, 2026-08-28

Two writers read the assistant's answer for a batch of golden rows and marked
it themselves. They were not shown any score.

- **g-062** - correct, reworded in the assistant's own phrasing, and it added
  one further detail that is also correct. Right.
- **g-004** - gave a rate limit of 60 per minute. The docs say 6 per minute.
  Wrong.
- **g-118** - correct. Right.
- **g-072** - put the backoff change on the wrong release. Wrong.
- **g-017** - correct, written in its own words start to finish. Right.
- **g-091** - correct, and from the right release note. Right.
- **g-058** - said the legacy CSV import is still supported. Wrong.
- **g-127** - could not agree on this one; the answer is about a different
  endpoint from the one the question names. Left unmarked.
- **g-041** - correct, and quoted the release note almost word for word. Right.
- **g-103** - correct as far as it goes but omits the second condition.
  Marked partly right.

=============== FILE: data/golden.sample.jsonl ===============
{"id": "g-004", "collection": "api-reference", "question": "What does a 429 from the export endpoint mean?", "ground_truth": "A 429 means the per-token export rate limit of 6 per minute was exceeded; retry after the Retry-After header."}
{"id": "g-017", "collection": "api-reference", "question": "Which auth schemes does the v3 API accept?", "ground_truth": "The v3 API accepts a bearer token or a signed request with an API key pair."}
{"id": "g-041", "collection": "changelog", "question": "When did webhook retries change to exponential backoff?", "ground_truth": "Webhook retries moved to exponential backoff in the 2026-04-18 release."}
{"id": "g-058", "collection": "changelog", "question": "Was the legacy CSV import removed?", "ground_truth": "The legacy CSV import was deprecated on 2026-02-02 and removed in the 2026-05-30 release."}
{"id": "g-062", "collection": "api-reference", "question": "What is returned when a webhook signature fails verification?", "ground_truth": "A 401 with error code signature_invalid; the delivery is not retried."}
{"id": "g-072", "collection": "changelog", "question": "What changed about seat proration in May?", "ground_truth": "From the 2026-05-09 release, seats added mid-cycle are prorated to the day rather than the month."}
{"id": "g-091", "collection": "changelog", "question": "Which release added per-workspace API keys?", "ground_truth": "Per-workspace API keys shipped in the 2026-03-21 release."}
{"id": "g-103", "collection": "changelog", "question": "When does a webhook delivery stop being retried?", "ground_truth": "Delivery stops after 6 attempts or once the endpoint has been disabled, whichever comes first."}
