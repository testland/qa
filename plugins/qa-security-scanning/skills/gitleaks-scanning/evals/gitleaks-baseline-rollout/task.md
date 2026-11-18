# The first gitleaks scan of a six-year-old repo found 214 findings

## Problem Description

We're adopting gitleaks on a six-year-old repository and the first scan found 214 findings (`reports/first-scan-summary.md`). Review the team's plan (`docs/plan.md`) and write our rollout in `ROLLOUT.md`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: reports/first-scan-summary.md ===============
gitleaks git over 6 years of history: 214 findings.
- 150 generic-api-key in tests/fixtures/** (fake values)
- 41 in old commits of config files (some may be real)
- 23 in docs/ (examples)

=============== FILE: docs/plan.md ===============
Plan from the team:
1. Add each of the 214 secret values to `[allowlist] regexes` so the scan is green.
2. Rewrite git history with git filter-repo to delete the 41 config findings, then we're clean.
3. Turn on the gitleaks CI job with the full report printed to the job log for visibility.
