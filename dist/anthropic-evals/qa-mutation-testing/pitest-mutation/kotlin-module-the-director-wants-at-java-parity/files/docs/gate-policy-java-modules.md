# Platform mutation gate policy (2025-03, unchanged)

| module      | language | gate | last scheduled run |
|-------------|----------|------|--------------------|
| pricing     | Java     | 80   | 84                 |
| checkout    | Java     | 80   | 83                 |
| ledger      | Java     | 80   | 81                 |
| settlement  | Java     | 80   | 86                 |
| notify      | Kotlin   | —    | not in the gate    |

Gates were set from each module's measured score at the time it joined, then
ratcheted once, in 2025-09. The build fails below the gate.
