# The same commit scores worse today than it did in June and nothing in it changed

## Problem Description

Our documentation assistant has a gate with four numbers on it. The thresholds
were set on 2026-06-04 from a run on commit `a91f3c2`, which we tagged, and the
gate has been green ever since until three weeks ago when it started going red
on unrelated pull requests.

On 2026-09-10 an engineer checked out that exact tag and re-ran the gate on it,
expecting to see the June numbers back, as a sanity check. He got materially
lower numbers on every one of the four. Same commit, same golden set, same
prompts, same retriever code.

There is a third run that makes this more interesting. On 2026-09-02 the same
engineer had already re-run the same tag with a restored wheelhouse we keep
cached from the spring, so the library versions were June's, and he saved that
output too. All three runs are in the attached comparison, along with the
dependency listings captured from the June and September jobs, the index
manifests from either side of the August rebuild, and our change log.

What I actually want out of this is that a year from now somebody can check out
a tag and get the same numbers off it. Right now we plainly cannot.

Two things are being proposed and I want a straight verdict on each.

The first is to take today's numbers as the new baseline, set the thresholds
under them and move on, on the argument that the code has not changed so the
quality has not changed and the thresholds are just stale. I do not think I
believe the middle step of that argument, and if I am wrong I would like to be
told why with reference to the three runs rather than in principle.

The second is Marta's branch `spike/deterministic-gate`, and I will be honest
that I find it hard to argue with. She points out that every one of our four
numbers comes out of a judge model that we do not control and that changes
under us, which is exactly the thing that has burned us here. Her branch
replaces the four with metrics the library ships that compute from the text
directly and never call a judge at all. She has run the tag through it three
times and the numbers are identical to four decimal places every time, which is
more than our current gate has ever managed. Her write-up, including a spot
check the docs team did on six rows, is attached. If this gets me a tag that
reproduces, I am inclined to take it.

## Output Specification

1. Edit `requirements.txt` and `.github/workflows/eval.yml` so that a re-run of
   a tagged commit produces comparable numbers.
2. Edit `eval/thresholds.yaml` only where the evidence in the attached
   comparison supports moving a threshold, and say in the file why. Leave the
   rest alone.
3. Write `docs/baseline-drift.md`: what moved between the three runs and the
   evidence separating each cause from the others, a granted-or-refused verdict
   on both proposals with the reason, and what has to happen before any
   threshold is re-set.

## Input Files

Extract the following files before beginning.

=============== FILE: requirements.txt ===============
ragas
openai
datasets
pyyaml

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

## The same three runs, context_recall only, api-reference rows and changelog rows counted separately

The golden set is 40 rows against the API reference and 40 against the
changelog.

| Run        | api-reference | changelog |
|------------|---------------|-----------|
| 2026-06-04 | 0.90          | 0.88      |
| 2026-09-02 | 0.90          | 0.78      |
| 2026-09-10 | 0.86          | 0.72      |

## Notes taken from the 09-10 job log

- `answer_relevancy` emitted a deprecation warning naming a replacement class.
- Three rows produced a different score on 09-10 than on 09-02 while the
  retrieved passages logged for them were byte-identical.

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
    { "name": "api-reference", "chunk_words": 220, "chunks": 4100 },
    { "name": "changelog", "chunk_words": 900, "chunks": 610 }
  ]
}

=============== FILE: artifacts/index-manifest-september.json ===============
{
  "built": "2026-08-30",
  "embedding_model": "text-embedding-3-large",
  "collections": [
    { "name": "api-reference", "chunk_words": 220, "chunks": 4100 },
    { "name": "changelog", "chunk_words": 300, "chunks": 1840 }
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

The library ships metrics that never call a judge. They compare the answer
text against the reference answer directly - n-gram overlap, longest common
subsequence, character-level overlap, string distance. No model, no API key,
no cost, no drift.

## What the branch does

Replaces the four judged metrics with four text-comparison metrics and sets
floors from the tag run. Same 80 golden rows, same runner.

| Run of tag a91f3c2 | overlap-A | overlap-B | char-overlap | string-distance |
|--------------------|-----------|-----------|--------------|-----------------|
| 2026-09-11, 09:14  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-11, 13:40  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |
| 2026-09-12, 08:05  | 0.6412    | 0.5903    | 0.7188       | 0.6644          |

Identical to four decimals, three runs, two days apart. Our current gate has
never repeated a number twice.

## Spot check the docs team ran on six golden rows

They read the answer the assistant gave and marked it right or wrong
themselves, with no reference to any score. `overlap-A` is from this branch;
`faithfulness` is from the 09-02 run for the same row.

| Row   | What the answer did                                          | Docs team | overlap-A | faithfulness |
|-------|--------------------------------------------------------------|-----------|-----------|--------------|
| g-004 | gave a rate limit of 60 per minute; the docs say 6 per minute | wrong     | 0.91      | 0.20         |
| g-017 | correct, but written in its own words start to finish          | right     | 0.29      | 0.96         |
| g-041 | correct, quoted the release note almost verbatim               | right     | 0.94      | 0.98         |
| g-058 | said the legacy CSV import is still supported                  | wrong     | 0.88      | 0.15         |
| g-062 | correct, reworded, plus one extra correct detail               | right     | 0.41      | 0.94         |
| g-072 | put the backoff change on the wrong release                    | wrong     | 0.86      | 0.34         |

I have not picked a floor yet. Open to suggestions on where to set it.

=============== FILE: data/golden.sample.jsonl ===============
{"id": "g-004", "collection": "api-reference", "question": "What does a 429 from the export endpoint mean?", "ground_truth": "A 429 means the per-token export rate limit of 6 per minute was exceeded; retry after the Retry-After header."}
{"id": "g-017", "collection": "api-reference", "question": "Which auth schemes does the v3 API accept?", "ground_truth": "The v3 API accepts a bearer token or a signed request with an API key pair."}
{"id": "g-041", "collection": "changelog", "question": "When did webhook retries change to exponential backoff?", "ground_truth": "Webhook retries moved to exponential backoff in the 2026-04-18 release."}
{"id": "g-058", "collection": "changelog", "question": "Was the legacy CSV import removed?", "ground_truth": "The legacy CSV import was deprecated on 2026-02-02 and removed in the 2026-05-30 release."}
{"id": "g-062", "collection": "api-reference", "question": "What is returned when a webhook signature fails verification?", "ground_truth": "A 401 with error code signature_invalid; the delivery is not retried."}
{"id": "g-072", "collection": "changelog", "question": "What changed about seat proration in May?", "ground_truth": "From the 2026-05-09 release, seats added mid-cycle are prorated to the day rather than the month."}
