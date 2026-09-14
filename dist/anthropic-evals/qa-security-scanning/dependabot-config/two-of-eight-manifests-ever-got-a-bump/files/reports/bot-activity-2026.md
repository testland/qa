# Bot pull requests, 2025-09-08 to 2026-09-08

Opened per month, per update block. The JavaScript block did not exist before
March, so its column starts empty by definition.

| Month   | JavaScript block | pip `/services/ranker` | github-actions `/` |
|---------|-----------------:|-----------------------:|-------------------:|
| 2025-09 |                - |                      1 |                  1 |
| 2025-10 |                - |                      1 |                  0 |
| 2025-11 |                - |                      1 |                  2 |
| 2025-12 |                - |                      1 |                  0 |
| 2026-01 |                - |                      1 |                  1 |
| 2026-02 |                - |                      2 |                  3 |
| 2026-03 |                0 |                      1 |                  0 |
| 2026-04 |                0 |                      0 |                  0 |
| 2026-05 |                0 |                      0 |                  0 |
| 2026-06 |                0 |                      0 |                  0 |
| 2026-07 |                0 |                      0 |                  0 |
| 2026-08 |                0 |                      0 |                  0 |
| 2026-09 |                0 |                      0 |                  0 |

Cross-checks run while gathering this:

- Last pull request from any block: 2026-03-06, pip, `Django 4.2.10 -> 4.2.11`.
  Nothing from any block since, including the two that had run continuously for
  years before that.
- All 8 ranker pull requests in the window were Django. `requests` 2.28.1 and
  `cryptography` 38.0.1 have both had releases in the window and neither was
  ever proposed.
- `git log .github/dependabot.yml` shows one commit in the window: 2026-03-12,
  "add the JavaScript workspace to the update bot", P. Raman (contractor,
  engagement ended 2026-03-20). No commits to the file since.
- `git log services/ranker/requirements.txt` shows hand edits on 2026-05-19
  (cryptography, for a CVE) and 2026-07-02 (added `orjson`).
- `git log .github/workflows/` shows 4 commits since March, most recently
  2026-06-24. Three of the six referenced actions have had major releases since
  they were pinned.
- Insights -> Dependency graph -> Dependabot shows a warning against
  `.github/dependabot.yml`. Tom says it has been there a while and he assumed
  it was about the deprecated action.
- `packages/api` runs `express` 4.17.1, released 2019.
