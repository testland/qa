# acme-platform — changes to pom.xml and .github/workflows/mutation.yml

| date       | ticket    | file     | change                                                                 |
|------------|-----------|----------|------------------------------------------------------------------------|
| 2026-03-04 | PLAT-3102 | workflow | Job added on pull_request. `mvn -B clean pitest:mutationCoverage`.      |
| 2026-05-19 | PLAT-3301 | pom      | Operator set widened to the complete catalogue. "More mutants, more signal." |
| 2026-07-08 | PLAT-3455 | workflow | `[skip-mut]` opt-out added to the job `if:` after complaints.           |
| 2026-08-20 | PLAT-3540 | workflow | `-DwithHistory` appended to the run step so PRs only re-mutate changed code. |

Nothing else has been touched. The runner is the hosted `ubuntu-latest` image;
the job has never had a cache step.
