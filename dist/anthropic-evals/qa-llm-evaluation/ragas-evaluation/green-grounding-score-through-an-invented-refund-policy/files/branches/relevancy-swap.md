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
