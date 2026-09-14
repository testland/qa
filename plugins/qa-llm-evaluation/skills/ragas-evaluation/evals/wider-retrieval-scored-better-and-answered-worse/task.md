# We went from 4 passages to 20 in August and HR has opened three tickets

## Problem Description

On 2026-08-03 we took the number of passages fed to the generator from 4 to 20.
The trigger was a run of "the answer just is not in there" complaints from the
legal team, whose contract PDFs are long and chunk badly. Widening it was the
cheapest thing we could try.

The eval gate passed the change without comment and the dashboard showed it as
a clear improvement, so it shipped the same afternoon.

Five weeks on, the legal complaints have basically stopped. HR has opened three
tickets saying the assistant has started answering handbook questions with
policies from the wrong department - asking about the engineering on-call
allowance and getting an answer that blends in the field-services standby rate,
that kind of thing. Nobody has changed the handbook corpus, the prompt, or the
model since July.

Both document sets go through the same retrieval config and the same eval run.
The before-and-after report is attached, including a per-route breakdown the
dashboard does not surface, the retrieval numbers we compute but have never
gated on, and a hand-count somebody did by reading thirty answers from each
run. There is a second read-through from earlier this month in the same folder.

Our tech lead has three suggestions and the third is the one he is pushing,
because he has already built it and it is on a branch.

The first is to switch on the rest of the retrieval metrics and see which ones
move, on the basis that one of them must know something. The second is to put
the number back to 4 and accept the legal complaints as the price.

The third is the branch. His argument is that the gate's real failure is that
it has no memory: it checks each run against a fixed floor and never against
the last run, so a change that quietly degrades something can sit above the
floor forever. So his branch makes the retrieval score a ratchet - it has to be
at least as high as the previous run's or the build fails - and he ran a wider
trial at the weekend to show the gate working. His note is attached.

I want to understand why the gate we already have called this an improvement,
because if it can wave this through it can wave through the next one, and I
want a verdict on all three of his suggestions rather than a plan.

## Output Specification

1. Edit `eval/metrics.py` and `eval/gate.py` so that a change of this shape
   cannot come out the other side reading as an improvement.
2. Edit `config/retrieval.yaml` where the evidence supports a change, and leave
   alone what the evidence does not support changing.
3. Write `docs/topk-review.md`: why the existing gate passed the change and
   which figures in the attached report establish it, a granted-or-refused
   verdict on each of the three suggestions with the reason, and what the new
   gate would have said on 2026-08-03.

## Input Files

Extract the following files before beginning.

=============== FILE: config/retrieval.yaml ===============
# Shared by both routes. Changed 2026-08-03 (top_k 4 -> 20).
embedding_model: text-embedding-3-large
top_k: 20
rerank: false

routes:
  handbook:
    corpus: hr-handbook
    chunk_words: 120
    chunks_indexed: 9400
    note: 22 departments, one index, department named in chunk metadata only
  contracts:
    corpus: legal-contracts
    chunk_words: 600
    chunks_indexed: 380
    note: long PDFs, clause text often split across two chunks

=============== FILE: eval/metrics.py ===============
from ragas.metrics import context_recall, faithfulness

GATED = [context_recall, faithfulness]

THRESHOLDS = {
    "context_recall": 0.85,
    "faithfulness": 0.90,
}

=============== FILE: eval/gate.py ===============
import json
import pathlib

from datasets import Dataset
from ragas import evaluate

from eval.metrics import GATED, THRESHOLDS

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load_golden():
    text = (ROOT / "data" / "golden.jsonl").read_text(encoding="utf-8")
    return Dataset.from_list([json.loads(line) for line in text.splitlines() if line.strip()])


def main():
    result = evaluate(load_golden(), metrics=GATED)
    print(result)
    for name, floor in THRESHOLDS.items():
        assert result[name] >= floor, f"{name} {result[name]:.2f} below {floor}"


if __name__ == "__main__":
    main()

=============== FILE: reports/topk-before-after.md ===============
# Retrieval width change, 2026-08-03. Same 60 golden rows, run before and after.

## What the dashboard showed

| Metric         | k=4  | k=20 | Gate  |
|----------------|------|------|-------|
| context_recall | 0.71 | 0.94 | >=0.85 |
| faithfulness   | 0.93 | 0.91 | >=0.90 |

Verdict printed on the day: PASS, and recall up 23 points. Change approved.

## Per-route breakdown (not on the dashboard)

30 handbook rows, 30 contract rows.

| Route     | Metric         | k=4  | k=20 |
|-----------|----------------|------|------|
| handbook  | context_recall | 0.86 | 0.93 |
| handbook  | faithfulness   | 0.94 | 0.86 |
| contracts | context_recall | 0.56 | 0.95 |
| contracts | faithfulness   | 0.92 | 0.96 |

## Retrieval numbers we compute on every run and have never gated on

These land on the second tab of the dashboard. Nobody has ever put a floor
under them.

| Route     | Metric            | k=4  | k=20 |
|-----------|-------------------|------|------|
| handbook  | context_precision | 0.97 | 0.95 |
| contracts | context_precision | 0.61 | 0.24 |

## Where the passage the answer needed was sitting in the ranking

Measured on the k=20 run: position of the passage containing the reference
answer, over the 30 rows of each route.

| Route     | Mean rank | Median rank | Worst rank |
|-----------|-----------|-------------|------------|
| handbook  | 1.4       | 1           | 3          |
| contracts | 7.4       | 6           | 16         |

## Hand-count, done 2026-09-05

Two people read the same 30 handbook answers from each run and counted answers
that stated a policy belonging to a department other than the one asked about.

| Route     | Observation                                        | k=4   | k=20  |
|-----------|----------------------------------------------------|-------|-------|
| handbook  | answers mixing in another department's policy       | 1/30  | 11/30 |
| contracts | "not in the document set" complaints, per fortnight | 14    | 2     |

Two of the eleven, written out:

- **hb-03**, "What is the on-call allowance for engineering?" Answer: "On-call
  is paid at 120 per weekend rotation; field services standby is paid at 95 per
  night." Passages 1 and 2 of the 20 were the engineering rotation policy;
  passage 9 was the field-services standby schedule. Every figure in the answer
  appears in one of the twenty passages.
- **hb-19**, "Can I carry annual leave into next year?" Answer: "Up to 5 days
  carry over and expire on 31 March; contractors accrue no carry-over."
  Passage 1 was the carry-over policy; passage 14 was the contractor terms
  appendix. Both statements appear in the passages.

=============== FILE: reports/readthrough-september.md ===============
# Second read-through, 2026-09-09

Same two people, same method as the 09-05 count. This batch is 30 handbook
answers taken from the wider trial configuration somebody ran over the weekend
of 2026-09-06, not from production.

Answers stating a policy belonging to a department other than the one asked
about: **19 of 30**.

Notes:

- The blended answers are longer than production's and tend to carry two or
  three departments' figures rather than two.
- In every one of the 19 the department that was actually asked about is also
  answered correctly somewhere in the reply.
- Nothing in the 30 states a figure that is not in the corpus.

=============== FILE: branches/recall-ratchet.md ===============
# Branch `spike/recall-ratchet` - J. Oduya, 2026-09-08

## What is wrong with the gate

It compares each run to a number somebody typed in April. It never compares a
run to the run before it. So anything that stays above the floor is invisible,
however far it has fallen since last week.

## What the branch does

Writes the run's retrieval score to `reports/last-run.json` and asserts the new
run is at least as high. Retrieval quality can go up or stay flat, never down:

```
prev = json.loads((ROOT / "reports" / "last-run.json").read_text())
assert result["context_recall"] >= prev["context_recall"], "retrieval regressed"
```

## Trial run, weekend of 2026-09-06

To check the ratchet actually bites I ran the same 60 golden rows at a wider
setting than production, k=50, and put it through the branch.

| Metric         | k=20 | k=50 | Floor  | Ratchet vs k=20 |
|----------------|------|------|--------|-----------------|
| context_recall | 0.94 | 0.97 | >=0.85 | passes          |
| faithfulness   | 0.91 | 0.91 | >=0.90 | n/a             |

Per route on the k=50 run, for completeness:

| Route     | context_recall | faithfulness |
|-----------|----------------|--------------|
| handbook  | 0.95           | 0.84         |
| contracts | 0.99           | 0.98         |

I think this is ready. It gives the gate the memory it has been missing.

=============== FILE: data/golden.sample.jsonl ===============
{"id": "hb-03", "route": "handbook", "user_input": "What is the on-call allowance for engineering?", "reference": "Engineering on-call is paid at 120 per weekend rotation, claimed through Workday."}
{"id": "hb-11", "route": "handbook", "user_input": "How much notice do I give for parental leave?", "reference": "Parental leave requires 8 weeks written notice to your manager and to People Ops."}
{"id": "hb-19", "route": "handbook", "user_input": "Can I carry annual leave into next year?", "reference": "Up to 5 days carry over and expire on 31 March."}
{"id": "ct-02", "route": "contracts", "user_input": "What is the termination notice period in the Northwind MSA?", "reference": "Either party may terminate the Northwind MSA on 90 days written notice."}
{"id": "ct-08", "route": "contracts", "user_input": "Does the Contoso agreement cap our liability?", "reference": "Liability under the Contoso agreement is capped at fees paid in the preceding 12 months."}
{"id": "ct-15", "route": "contracts", "user_input": "Is there an auto-renewal clause with Fabrikam?", "reference": "The Fabrikam agreement auto-renews for successive 12 month terms unless notice is given 60 days before the term ends."}

=============== FILE: requirements.txt ===============
ragas==0.2.14
datasets==3.0.1
