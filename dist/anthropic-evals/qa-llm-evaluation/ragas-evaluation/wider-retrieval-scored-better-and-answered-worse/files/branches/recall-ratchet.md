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

The same two readers did the hand-count again on the k=50 handbook answers:
19 of 30 mixed in another department's policy, against 11 of 30 at k=20.

Verdict printed by the branch on the k=50 run: **PASS**.

I think this is ready. It gives the gate the memory it has been missing.
