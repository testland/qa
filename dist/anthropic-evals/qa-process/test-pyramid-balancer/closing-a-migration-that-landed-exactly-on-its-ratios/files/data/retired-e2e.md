# harbor - end-to-end cases retired during Q2

124 cases came out of the end-to-end suite between 2026-04-07 and 2026-09-11.
Every retirement commit records a `replaced-by:` trailer naming the suite that
took the assertion over.

| Cases retired | `replaced-by:`                                   |
|--------------:|--------------------------------------------------|
|            41 | `test/integration/fees-boundary.test.js`          |
|            29 | `test/integration/permission-matrix.test.js`      |
|            27 | `test/integration/statement-period.test.js`       |
|            21 | `test/integration/export-columns.test.js`          |
|             6 | `feature-removed` — the v1 export surface was deleted in Q2 |
