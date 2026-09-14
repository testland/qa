# Bot pull requests, 2025-09-08 to 2026-09-08

| Block                              | PRs | What they were                                     |
|------------------------------------|----:|----------------------------------------------------|
| npm `/`                            |  61 | eslint plugins, `@types/*`, prettier, typescript    |
| pip `/services/ranker`             |   4 | Django 4.2.7 -> 4.2.8 -> 4.2.9 -> 4.2.10 -> 4.2.11  |
| github-actions `/.github/workflows`|   0 | -                                                   |

Cross-checks run while gathering this:

- `packages/api` runs `express` 4.17.1, released 2019.
- The ranker service pins `requests` 2.28.1 and `cryptography` 38.0.1. Both
  have had releases since.
- Six distinct actions are referenced across the 9 workflow files; three of
  them have had major releases since we pinned them.
- The repository's dependency graph page lists three update configurations and
  reports no error against the file.
- All 61 root pull requests were merged without incident. Nobody has complained
  about the volume.
