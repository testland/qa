# GitHub Actions usage export - paperclip - August 2026

Workflow: `test.yml`. 620 runs (487 on pull requests, 133 on pushes to main).
Billed at $0.008 per billable minute. Included minutes exhausted on 04 Aug.

| Runner         | Runner minutes | Multiplier | Billable minutes |     Cost |
|----------------|---------------:|-----------:|-----------------:|---------:|
| ubuntu-latest  |         18,600 |         x1 |           18,600 |  $148.80 |
| windows-latest |         21,700 |         x2 |           43,400 |  $347.20 |
| macos-latest   |         23,000 |        x10 |          230,000 | $1,840.00 |
| **Total**      |     **63,300** |            |      **292,000** | **$2,336.00** |

Run-level notes from the export:

- Median duration of one `test` matrix job: 9 min on Linux, 11 min on macOS,
  13 min on Windows. `npm ci` plus checkout accounts for 1.5 min of each.
- 148 of the 620 runs had a newer commit pushed to the same branch before the
  run finished. Those runs continued to completion.
- 11 jobs reached the maximum job duration and were terminated by the platform
  at 6 hours. All 11 were `test (macos-latest, 20)`. Cause not recorded here;
  the suite's own longest recorded run is 14 minutes.
- 96 runs were on branches whose only changed files were under `docs/`.

Release blockers caught in Q2, from the release wiki:

| Blocker  | Found by                        | Would Linux or Windows have caught it? |
|----------|---------------------------------|----------------------------------------|
| REL-3301 | test (macos-latest, 22)         | No - keychain entitlement path          |
| REL-3318 | test (windows-latest, 20)       | No - path separator                     |
| REL-3327 | test (macos-latest, 20)         | No - case-insensitive volume default    |
