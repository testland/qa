# Three branches all claim to fix the same three blank rows and I have to pick one

## Problem Description

Between 2026-08-24 and 2026-08-28 the support assistant told somewhere around
forty customers that we operate a "14-day cooling-off period" on annual plans.
We do not. It is not in the handbook, it is not in the terms, it has never been
a policy here. Two of those customers have been refunded out of goodwill and
one is still arguing with us.

The nightly grounding job was green on every one of those days. It printed 0.97
on the 26th, which was the worst day. Three of the twelve questions in the eval
set are the cooling-off question in three phrasings, added in July by a
colleague after a near miss.

What I have in front of me is the runner, the builder that feeds it, the eval
set, the answer log for the 26th with everything the assistant had in front of
it, and the nightly output. Whatever happened should be recoverable from those.

Since the 18th of August three rows in the nightly per-row artifact have come
out with nothing in the score column. Three people have written a branch about
it in the last fortnight and all three notes are attached.

- **Priya's** swaps the metric for a different one out of the same library that
  reads the answer against the question instead. She reports 0.99 across all
  twelve rows on the 26th, no blanks, and she is on leave until the 22nd.
- **Anders'** keeps the metric and fills the gap from the eval set instead:
  where the answer cited nothing, hand the metric the reference sentence we
  already store for that question. He says it puts q-04, q-07 and q-11 at 0.00
  on the 26th and turns the run red.
- **Tomas'** changes what the builder hands the metric. It takes the 26th from
  0.97 down to 0.73 on a night when nobody touched the assistant, the corpus or
  the eval set, and he has not been able to say whether the old number or his
  new one is the wrong one, so it is still sitting on the branch.

Anders' does the thing I actually asked for. Priya's gets me a reading on every
row for the first time since August. Tomas' drops us twenty-four points for no
reason I can see. I have to land one of them today.

Two other things are on the list. Dmitri wants the passing bar moved from 0.90
to 0.95 on the grounds that 0.97 left no headroom. Someone else thinks the
judge model has got softer over the summer and we should move to a different
vendor's judge. And Kwame wants the nightly job to fail outright the moment any
row in the set produces no score, instead of carrying on.

Last thing. The analyst who went through this flagged row q-09, which scored a
clean 1.00 on the 26th. I have read the answer it gave and I do not think it is
right. I want the 1.00 explained rather than hand-waved.

## Output Specification

1. Edit `eval/build_dataset.py` and `eval/run_eval.py`. After your change, a
   re-run against the attached log must put the three cooling-off rows on the
   failing side of the gate rather than leaving them blank.
2. Do not change `data/eval_set.jsonl` or `logs/answers.jsonl`. I want to run
   your version against the same two files and watch it go red.
3. Write `docs/grounding-diagnosis.md`: what the 0.97 was actually computed
   over and the specific evidence in the attached files that establishes it, a
   granted-or-refused verdict on each of the six things above with the reason,
   and your explanation of q-09 including what would have to be measured for a
   row like it to be caught.

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
                "contexts": [c["text"] for c in logged["citations"]],
            }
        )
    return Dataset.from_list(rows)

=============== FILE: eval/run_eval.py ===============
import csv
import pathlib

from build_dataset import build
from ragas import evaluate
from ragas.metrics import faithfulness

ROOT = pathlib.Path(__file__).resolve().parents[1]
BAR = 0.90

result = evaluate(build(), metrics=[faithfulness])
df = result.to_pandas()
score = float(df["faithfulness"].mean())

out = ROOT / "reports" / "nightly.csv"
df[["question", "faithfulness"]].to_csv(out, index=False, quoting=csv.QUOTE_MINIMAL)

print(f"rows evaluated: {len(df)}")
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
{"id": "q-09", "answer": "Annual refunds are prorated, so cancelling halfway through returns the unused half of the term.", "retrieved": [{"chunk_id": "kb-partner-0417", "text": "Mid-term termination. Where the agreement is ended part-way through a term, fees are prorated and the unused portion is returned."}], "citations": [{"chunk_id": "kb-partner-0417", "text": "Mid-term termination. Where the agreement is ended part-way through a term, fees are prorated and the unused portion is returned."}]}
{"id": "q-10", "answer": "An account owner adds them from Settings > Members. The new seat is prorated onto your next invoice.", "retrieved": [{"chunk_id": "hb-seats-01", "text": "Seats. An account owner adds members from Settings > Members. New seats are prorated on the next invoice."}], "citations": [{"chunk_id": "hb-seats-01", "text": "Seats. An account owner adds members from Settings > Members. New seats are prorated on the next invoice."}]}
{"id": "q-11", "answer": "That is right, there is a two-week cooling-off window on annual contracts.", "retrieved": [{"chunk_id": "hb-refunds-03", "text": "Refunds. There is no cooling-off period on any plan."}, {"chunk_id": "hb-refunds-02", "text": "Refunds. Annual plans are refundable in full within 30 days of the charge and not at all after that. Annual refunds are never prorated."}], "citations": []}
{"id": "q-12", "answer": "Yes, at rest and in transit.", "retrieved": [{"chunk_id": "hb-sec-11", "text": "Encryption. Data is encrypted at rest and in transit."}], "citations": [{"chunk_id": "hb-sec-11", "text": "Encryption. Data is encrypted at rest and in transit."}]}

=============== FILE: reports/nightly-2026-08-26.md ===============
# Nightly grounding run, 2026-08-26

Gate: grounding >= 0.90.

Runner stdout, copied out of the job log:

```
rows evaluated: 12
grounding 0.97 (bar 0.90)
```

Verdict: **PASS**. The per-row artifact the runner wrote that night is kept
below exactly as it came out.

=============== FILE: reports/nightly.csv ===============
question,faithfulness
How long do I have to get a refund on a monthly plan?,1.0
Where do I download an invoice?,1.0
Can I move a seat to a different person?,1.0
Is there a cooling-off period on the annual plan?,
Do you support SAML?,1.0
What happens if my card is declined?,1.0
"If I sign up for a year and change my mind in the first fortnight, what happens?",
Where is our data stored?,0.75
"If I cancel an annual plan halfway through, do I get half my money back?",1.0
How do I add a teammate?,1.0
"A colleague said there is a two-week window to back out of an annual contract. Is that right?",
Is data encrypted at rest?,1.0

=============== FILE: branches/relevancy-swap.md ===============
# Branch `fix/no-more-n-a` - P. Raghavan, 2026-09-02

Off until the 22nd. Here is the case for this one.

Three of our twelve rows have come out of the nightly with nothing in them
since the middle of August. The metric we gate on reads the answer against the
passage list the assistant cited. Give it a row with an empty passage list and
there is nothing for it to read against, so nothing comes back and the row
leaves no number behind.

There is a metric in the same library that does not want the passage list at
all. It reads the answer against the question. It can score every row we have,
including the three that come back empty today.

Two lines:

```
-from ragas.metrics import faithfulness
+from ragas.metrics import answer_relevancy
 ...
-result = evaluate(build(), metrics=[faithfulness])
-score = float(df["faithfulness"].mean())
+result = evaluate(build(), metrics=[answer_relevancy])
+score = float(df["answer_relevancy"].mean())
```

Re-ran the 2026-08-26 log on the branch. Twelve rows in, twelve numbers out,
nothing blank. Reported **0.99**, verdict **PASS**.

A gate with no holes in it beats a gate with three.

=============== FILE: branches/reference-fallback.md ===============
# Branch `fix/reference-fallback` - A. Lindqvist, 2026-09-09

Priya is solving this by changing what we measure. I would rather keep
measuring the same thing and stop handing the metric an empty list.

We already store the correct sentence for every question in the eval set - that
is what the `reference` field is for. So: where the answer cited nothing, hand
the metric that sentence as the passage. Same metric, same bar, no blanks.

```
-"contexts": [c["text"] for c in logged["citations"]],
+cited = [c["text"] for c in logged["citations"]]
+"contexts": cited or [case["reference"]],
```

Re-ran the 26th. q-04, q-07 and q-11 come out at **0.00** and the run goes
**red**, which is the outcome everyone in this thread says they want. Nine
lines of diff including the test.

=============== FILE: branches/builder-change.md ===============
# Branch `spike/builder` - T. Okonkwo, 2026-09-10

I changed what the builder hands the metric. I have not changed the metric, the
bar, the eval set, the corpus, the judge or the assistant.

The 26th comes out at **0.73** instead of 0.97 and the run goes red.

That is a twenty-four point move on a night that is three weeks old and cannot
change any more, which means one of the two numbers is not measuring what we
have been telling people it measures. I have not worked out which, and I am not
putting a red gate in front of the team on a hunch, so it is parked here.

If somebody can tell me which of 0.97 and 0.73 is the honest reading of that
night, I will either merge this or delete it.

=============== FILE: requirements.txt ===============
ragas==0.2.14
datasets==3.0.1
pandas==2.2.3
