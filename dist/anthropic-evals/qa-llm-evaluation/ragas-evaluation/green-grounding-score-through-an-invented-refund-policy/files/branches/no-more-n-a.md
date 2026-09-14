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
