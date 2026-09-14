# billing-core — changes to pom.xml this month

| date       | PR    | who     | what                                                                 |
|------------|-------|---------|----------------------------------------------------------------------|
| 2026-09-03 | #8841 | team    | JUnit 5 migration merged. Test sources moved to the Jupiter API.      |
| 2026-09-08 | #8859 | D.K.    | Widened the mutated set so the run would stop saying it sees nothing. |
| 2026-09-09 | #8863 | Y.M.    | Raised `coverageThreshold` from 75 to 95 for QUAL-712 (audit prep).   |

QUAL-712 is a tracker-wide ticket asking every module to tighten its coverage
gate before the October audit. It was applied to eleven modules the same
afternoon. Nothing in `src/main` has changed since 2026-08-28 apart from a
javadoc typo.
