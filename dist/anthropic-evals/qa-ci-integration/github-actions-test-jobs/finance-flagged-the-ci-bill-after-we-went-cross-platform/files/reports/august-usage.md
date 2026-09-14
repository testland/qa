# GitHub Actions usage export - paperclip - August 2026

Workflow: `test.yml`. 620 runs (487 on pull requests, 133 on pushes to main).
Billed at $0.008 per billable minute. Included minutes exhausted on 04 Aug.
August total: $1,775.36.

| Runner         | Runner minutes | Multiplier |
|----------------|---------------:|-----------:|
| ubuntu-latest  |         14,880 |         x1 |
| windows-latest |         16,120 |         x2 |
| macos-latest   |         17,480 |        x10 |
| **Total**      |     **48,480** |            |

Run-level notes from the export:

- Median duration of one `test` matrix job: 9 min on Linux, 11 min on macOS,
  13 min on Windows. Checkout plus `npm ci` accounts for about 1.5 min of each.
- The `integration` job runs once per run on ubuntu-latest, median 6 min.
- 148 of the 620 runs had a newer commit pushed to the same branch before the
  run finished. Those runs continued to completion.

Longest 12 jobs on this account in August:

| Job                          | Duration |
|------------------------------|---------:|
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (macos-latest, 20)      |   360:00 |
| test (windows-latest, 22)    |    14:12 |

Release blockers caught in Q2, from the release wiki:

| Blocker  | Found by                  | Note from the postmortem                          |
|----------|---------------------------|---------------------------------------------------|
| REL-3301 | test (macos-latest, 22)   | Keychain entitlement path.                         |
| REL-3318 | test (windows-latest, 20) | Path separator.                                    |
| REL-3327 | test (macos-latest, 20)   | Case-insensitive volume default. Surfaced only on  |
|          |                           | the re-run - on the first run that leg had already |
|          |                           | been stopped when the Windows job failed a minute  |
|          |                           | earlier.                                           |
