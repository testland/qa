# Continuous coverage mapping and LLM-claim verification

Deep reference for the `ai-spec-coverage-mapper` SKILL.md. Consult when
scheduling the mapper on a cadence, or when hardening the report against
LLM-hallucinated coverage claims.

## Run it on a weekly cadence

A single mapping goes stale the moment ACs or tests change. Schedule it
weekly and open an issue with the report:

```yaml
on:
  schedule:
    - cron: '0 4 * * MON'

jobs:
  spec-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: python scripts/ai-coverage.py
      - uses: peter-evans/create-issue-from-file@v5
        with:
          title: 'Spec coverage report - week of ${{ github.event.repository.updated_at }}'
          content-filepath: spec-coverage-report.md
```

Filter to the ACs and tests changed since the last run to keep cost and
runtime down - re-mapping the whole codebase every week is slow and
expensive for no new signal.

## Verify the LLM's coverage claims

LLMs may claim a test "covers" an AC when it doesn't. Before trusting a
`full` row:

- **Spot-check the highest-priority ACs manually** - read the named test
  and confirm it asserts what the AC requires.
- **Cross-reference with `acceptance-test-from-criteria`** (in the qa-bdd
  plugin) if the team uses `@AC-X.Y` tags - those tags are the ground
  truth the LLM's semantic guess can be checked against.
- **Compare the LLM's claim against the test code in human review** -
  the report is a starting point for triage, not an authority.

The mapper reads code; it does not run it. A test that imports cleanly
but throws at runtime can still be classified "covered," so a green
matrix is a prompt to verify, not a sign-off on its own.
