# Notes pasted from the CI failure triage channel

- checkout applies regional tax — timeout waiting for the tax row; only on the
  tablet-768 project. Two people have looked, neither reproduced it locally.
- search returns paged results — result count off by one when the indexer is
  mid-refresh. Known race, no ticket yet.
- admin bulk export completes — started Tuesday. Nobody has looked at it. There
  were 14 commits merged on Monday evening.
- profile avatar upload succeeds — failed twice, both times the CDN sandbox was
  down for maintenance.
- report pdf export downloads — the renderer container OOMs on the large
  fixture. Reproduces locally about three times in four.
- cart merges guest session — session cookie sometimes not set before the
  assertion runs. Long-standing.
