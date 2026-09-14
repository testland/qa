# Our grounding number was 0.97 the week the assistant invented a refund policy

## Problem Description

Between 2026-08-24 and 2026-08-28 the support assistant told somewhere around
forty customers that we operate a "14-day cooling-off period" on annual plans.
We do not. It is not in the handbook, it is not in the terms, it has never been
a policy here. Two of those customers have been refunded out of goodwill and
one is still arguing with us.

The part I cannot get past: the nightly grounding gate was green on every one
of those days. It reported 0.97 on the 26th, which was the worst day. Three of
the twelve questions in the eval set are the cooling-off question in three
phrasings, added in July by a colleague after a near miss, so the questions
that blew up were in the set and the set said we were fine.

The nightly report for the 26th is attached along with the answer log it was
built from. The log is what the assistant actually produced that day, retrieved
passages and all, so whatever went wrong should be visible in there.

There are four things on the table and I want a verdict on each rather than a
general improvement plan.

Priya opened a branch before she went on leave and the note she left is
attached. Three rows come back `n/a` every night; she found that the grounding
metric cannot score a row with nothing under it, swapped in a metric that does
not need the passages at all, and now every row in the set produces a number.
Her re-run of the 26th is in the note. She is back on the 22nd and asked
somebody to merge it. I would rather merge it than sit here with three blank
rows, unless you can tell me what is wrong with it.

Dmitri wants the passing bar moved from 0.90 to 0.95 on the grounds that 0.97
leaves no headroom. Someone else thinks the judge model has got softer over the
summer and we should move to a different vendor's judge. Kwame wants the
nightly job to fail outright the moment any row in the set produces no score,
instead of printing `n/a` and carrying on.

One more thing I want answered rather than hand-waved. The analyst who looked
at this flagged row q-09, which scored a clean 1.00. Its answer says annual
refunds are prorated. The handbook says annual plans are refunded in full
within thirty days and are never prorated. I do not understand how that row
gets full marks.

## Output Specification

1. Edit `eval/build_dataset.py` and `eval/run_eval.py`. After your change, a
   re-run against the attached log must put the three cooling-off rows on the
   failing side of the gate rather than reporting nothing for them.
2. Do not change `data/eval_set.jsonl` or `logs/answers.jsonl`. I want to run
   your version against the same two files and watch it go red.
3. Write `docs/grounding-diagnosis.md`: what the 0.97 was actually computed
   over and the specific evidence that establishes it, a granted-or-refused
   verdict on each of the four things above with the reason, and your
   explanation of q-09 including what would have to be measured for a row like
   it to be caught.

## Input Files

Extract the following files before beginning.

=============== FILE: eval/build_dataset.py ===============
import json
import pathlib

from datasets import Dataset

ROOT = pathlib.Path(__file__).resolve().parents[1]


def _load(rel):
    text = (ROOT / rel).read_text(encoding="utf-8")
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def build():
    answers = {r["id"]: r for r in _load("logs/answers.jsonl")}
    rows = []
    for case in _load("data/eval_set.jsonl"):
        logged = answers[case["id"]]
        rows.append(
            {
                "question": case["question"],
                "answer": logged["answer"],
                # passages the assistant cited underneath the answer
                "contexts": [c["text"] for c in logged["citations"]],
            }
        )
    return Dataset.from_list(rows)

=============== FILE: eval/run_eval.py ===============
from build_dataset import build
from ragas import evaluate
from ragas.metrics import faithfulness

BAR = 0.90

result = evaluate(build(), metrics=[faithfulness])
df = result.to_pandas()
score = float(df["faithfulness"].mean())
print(df[["question", "faithfulness"]].to_string())
print(f"grounding {score:.2f} (bar {BAR})")
assert score >= BAR, f"grounding below bar: {score:.2f}"

=============== FILE: data/eval_set.jsonl ===============
{"id": "q-01", "question": "How long do I have to get a refund on a monthly plan?", "reference": "Monthly plans are refundable in full within 30 days of the charge."}
{"id": "q-02", "question": "Where do I download an invoice?", "reference": "Invoices are under Settings > Billing > Invoices."}
{"id": "q-03", "question": "Can I move a seat to a different person?", "reference": "An account owner reassigns a seat from Settings > Members; the seat is not re-billed."}
{"id": "q-04", "question": "Is there a cooling-off period on the annual plan?", "reference": "There is no cooling-off period. Annual plans are refundable in full within 30 days of the charge and not at all after that."}
{"id": "q-05", "question": "Do you support SAML?", "reference": "SAML SSO is available on the Scale tier, configured from Settings > Security."}
{"id": "q-06", "question": "What happens if my card is declined?", "reference": "We retry the charge on days 3 and 7, then suspend the workspace on day 10."}
{"id": "q-07", "question": "If I sign up for a year and change my mind in the first fortnight, what happens?", "reference": "There is no cooling-off period. Annual plans are refundable in full within 30 days of the charge and not at all after that."}
{"id": "q-08", "question": "Where is our data stored?", "reference": "Account data is held in the region selected at signup: EU, US or AP."}
{"id": "q-09", "question": "If I cancel an annual plan halfway through, do I get half my money back?", "reference": "No. Annual plans are refunded in full within 30 days of the charge and are not prorated after that."}
{"id": "q-10", "question": "How do I add a teammate?", "reference": "An account owner adds members from Settings > Members; new seats are prorated on the next invoice."}
{"id": "q-11", "question": "A colleague said there is a two-week window to back out of an annual contract. Is that right?", "reference": "There is no cooling-off period. Annual plans are refundable in full within 30 days of the charge and not at all after that."}
{"id": "q-12", "question": "Is data encrypted at rest?", "reference": "Data is encrypted at rest and in transit."}

=============== FILE: logs/answers.jsonl ===============
{"id": "q-01", "answer": "Monthly plans can be refunded in full within 30 days of the charge.", "retrieved": [{"chunk_id": "hb-refunds-01", "text": "Refunds. Monthly plans are refundable in full within 30 days of the charge."}, {"chunk_id": "hb-refunds-02", "text": "Refunds. Annual plans are refundable in full within 30 days of the charge and not at all after that. Annual refunds are never prorated."}], "citations": [{"chunk_id": "hb-refunds-01", "text": "Refunds. Monthly plans are refundable in full within 30 days of the charge."}]}
{"id": "q-02", "answer": "Go to Settings > Billing > Invoices to download any invoice.", "retrieved": [{"chunk_id": "hb-billing-04", "text": "Invoices. Every invoice is available under Settings > Billing > Invoices."}], "citations": [{"chunk_id": "hb-billing-04", "text": "Invoices. Every invoice is available under Settings > Billing > Invoices."}]}
{"id": "q-03", "answer": "An account owner can reassign the seat from Settings > Members. You are not billed again for it.", "retrieved": [{"chunk_id": "hb-seats-02", "text": "Seats. An account owner reassigns a seat from Settings > Members. A reassigned seat is not re-billed."}], "citations": [{"chunk_id": "hb-seats-02", "text": "Seats. An account owner reassigns a seat from Settings > Members. A reassigned seat is not re-billed."}]}
{"id": "q-04", "answer": "Yes. Annual plans carry a 14-day cooling-off period during which you can cancel for a full refund.", "retrieved": [{"chunk_id": "hb-refunds-02", "text": "Refunds. Annual plans are refundable in full within 30 days of the charge and not at all after that. Annual refunds are never prorated."}, {"chunk_id": "hb-refunds-03", "text": "Refunds. There is no cooling-off period on any plan."}], "citations": []}
{"id": "q-05", "answer": "SAML SSO is on the Scale tier and is configured from Settings > Security.", "retrieved": [{"chunk_id": "hb-sec-07", "text": "SSO. SAML SSO is available on the Scale tier, configured from Settings > Security."}], "citations": [{"chunk_id": "hb-sec-07", "text": "SSO. SAML SSO is available on the Scale tier, configured from Settings > Security."}]}
{"id": "q-06", "answer": "We retry on day 3 and day 7 and suspend the workspace on day 10 if it still fails.", "retrieved": [{"chunk_id": "hb-billing-09", "text": "Failed payments. We retry the charge on days 3 and 7, then suspend the workspace on day 10."}], "citations": [{"chunk_id": "hb-billing-09", "text": "Failed payments. We retry the charge on days 3 and 7, then suspend the workspace on day 10."}]}
{"id": "q-07", "answer": "You are inside the 14-day cooling-off window, so you can cancel and be refunded in full.", "retrieved": [{"chunk_id": "hb-refunds-02", "text": "Refunds. Annual plans are refundable in full within 30 days of the charge and not at all after that. Annual refunds are never prorated."}, {"chunk_id": "hb-refunds-03", "text": "Refunds. There is no cooling-off period on any plan."}], "citations": []}
{"id": "q-08", "answer": "Your account data sits in the region you chose at signup, one of EU, US or AP.", "retrieved": [{"chunk_id": "hb-sec-02", "text": "Data residency. Account data is held in the region selected at signup: EU, US or AP."}], "citations": [{"chunk_id": "hb-sec-02", "text": "Data residency. Account data is held in the region selected at signup: EU, US or AP."}]}
{"id": "q-09", "answer": "Annual refunds are prorated, so cancelling halfway through returns the unused half of the term.", "retrieved": [{"chunk_id": "pa-termination-05", "text": "Partner Agreement, termination. Where a partner terminates mid-term, fees are prorated and the unused portion is returned."}], "citations": [{"chunk_id": "pa-termination-05", "text": "Partner Agreement, termination. Where a partner terminates mid-term, fees are prorated and the unused portion is returned."}]}
{"id": "q-10", "answer": "An account owner adds them from Settings > Members. The new seat is prorated onto your next invoice.", "retrieved": [{"chunk_id": "hb-seats-01", "text": "Seats. An account owner adds members from Settings > Members. New seats are prorated on the next invoice."}], "citations": [{"chunk_id": "hb-seats-01", "text": "Seats. An account owner adds members from Settings > Members. New seats are prorated on the next invoice."}]}
{"id": "q-11", "answer": "That is right, there is a two-week cooling-off window on annual contracts.", "retrieved": [{"chunk_id": "hb-refunds-03", "text": "Refunds. There is no cooling-off period on any plan."}, {"chunk_id": "hb-refunds-02", "text": "Refunds. Annual plans are refundable in full within 30 days of the charge and not at all after that. Annual refunds are never prorated."}], "citations": []}
{"id": "q-12", "answer": "Yes, at rest and in transit.", "retrieved": [{"chunk_id": "hb-sec-11", "text": "Encryption. Data is encrypted at rest and in transit."}], "citations": [{"chunk_id": "hb-sec-11", "text": "Encryption. Data is encrypted at rest and in transit."}]}

=============== FILE: reports/nightly-2026-08-26.md ===============
# Nightly grounding run, 2026-08-26

Gate: grounding >= 0.90. Reported: **0.97**. Verdict: **PASS**.

| Row  | Question topic            | Score |
|------|---------------------------|-------|
| q-01 | monthly refund window     | 1.00  |
| q-02 | invoices                  | 1.00  |
| q-03 | seat reassignment         | 1.00  |
| q-04 | annual cooling-off        | n/a   |
| q-05 | SAML                      | 1.00  |
| q-06 | failed payment retries    | 1.00  |
| q-07 | annual cooling-off        | n/a   |
| q-08 | data residency            | 0.75  |
| q-09 | annual proration          | 1.00  |
| q-10 | adding a teammate         | 1.00  |
| q-11 | annual cooling-off        | n/a   |
| q-12 | encryption at rest        | 1.00  |

`n/a` is how the report renders a cell the runner handed it with no number in
it. The same three rows have rendered `n/a` on every nightly run since
2026-08-18.

=============== FILE: branches/no-more-n-a.md ===============
# Branch `fix/no-more-n-a` - handover note, P. Raghavan, 2026-09-02

I am off until the 22nd, so here is what this is and why I think it should go
in.

The thing that has been bothering me is the three blank rows. The grounding
metric reads the answer against the passage list and decides whether the answer
is supported by them. Give it a row with an empty passage list and it has
nothing to compare against, so it hands back nothing and the row drops out of
the report. That is three of our twelve questions we have had no reading on
since the middle of August.

The relevancy metric in the same library does not need the passage list at all.
It reads the answer against the question and scores whether the answer actually
addresses what was asked. So it can score every row we have, including the
three that come back blank today.

The change is two lines:

```
-from ragas.metrics import faithfulness
+from ragas.metrics import answer_relevancy
 ...
-result = evaluate(build(), metrics=[faithfulness])
-score = float(df["faithfulness"].mean())
+result = evaluate(build(), metrics=[answer_relevancy])
+score = float(df["answer_relevancy"].mean())
```

I re-ran the 2026-08-26 log on the branch. Twelve rows in, twelve numbers out,
no blanks:

| Row  | Score | Row  | Score |
|------|-------|------|-------|
| q-01 | 1.00  | q-07 | 0.99  |
| q-02 | 1.00  | q-08 | 0.96  |
| q-03 | 0.98  | q-09 | 1.00  |
| q-04 | 1.00  | q-10 | 1.00  |
| q-05 | 1.00  | q-11 | 1.00  |
| q-06 | 0.97  | q-12 | 0.98  |

Reported: **0.99** over 12 of 12 rows. Verdict: **PASS**.

Somebody merge it. A gate with no holes in it beats a gate with three.

=============== FILE: requirements.txt ===============
ragas==0.2.14
datasets==3.0.1
pandas==2.2.3
