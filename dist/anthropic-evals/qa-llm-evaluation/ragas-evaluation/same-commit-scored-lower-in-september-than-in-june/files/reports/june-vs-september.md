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
