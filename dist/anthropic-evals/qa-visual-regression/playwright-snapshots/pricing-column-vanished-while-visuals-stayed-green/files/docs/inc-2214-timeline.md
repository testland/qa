# INC-2214 - plan comparison column absent on /pricing

| When (UTC)       | What                                                                    |
|------------------|--------------------------------------------------------------------------|
| 2026-09-01 14:20 | Release 2026.9.1 ships. Plan-comparison column stops rendering; the region it occupied is blank white. |
| 2026-09-01 14:31 | Visual job run 6598 on main: green.                                      |
| 2026-09-02 11:14 | Routine baseline refresh merged (PR #2098).                              |
| 2026-09-03       | Six more visual runs, all green.                                         |
| 2026-09-04 09:05 | Fix deployed, column renders again.                                      |
| 2026-09-04 09:22 | Visual job run 6641 on main: green. Report attached.                     |

19 visual runs inside the window. Zero failures. The customer report arrived
2026-09-04 08:12.
