# identity-svc — weekly mutation job, pulled from the build store 2026-09-09

Monthly samples of the 26 runs since #2288 landed. Every run in the full list,
not only these, finished with exit code 0 and a green check.

| Run date   | Build | Mutants | Score  | Line coverage | Job result | Exit code |
|------------|-------|---------|--------|---------------|------------|-----------|
| 2026-03-04 |  5510 |   1,204 | 78.9%  | 86.4%         | success    | 0         |
| 2026-04-01 |  5602 |   1,219 | 77.1%  | 86.2%         | success    | 0         |
| 2026-05-06 |  5711 |   1,266 | 74.8%  | 86.0%         | success    | 0         |
| 2026-06-03 |  5824 |   1,301 | 70.2%  | 85.9%         | success    | 0         |
| 2026-07-01 |  5930 |   1,388 | 66.5%  | 86.1%         | success    | 0         |
| 2026-08-05 |  6044 |   1,455 | 58.3%  | 86.3%         | success    | 0         |
| 2026-09-02 |  6151 |   1,502 | 52.4%  | 86.2%         | success    | 0         |

Notes from whoever wrote this script (me, Wednesday night):

- The mutant count rises every month, so each run is analysing that month's
  code, not a copy of March's.
- The only artefact any of these runs left behind is the console log. There is
  no per-file breakdown stored anywhere for any of the 26 runs, which is why I
  cannot tell you which directory the slide came from.
- The coverage job in the same workflow has failed four times this year and
  each time somebody fixed it the same day.
