Plan from the team:
1. Add each of the 214 secret values to `[allowlist] regexes` so the scan is green.
2. Rewrite git history with git filter-repo to delete the 41 config findings, then we're clean.
3. Turn on the gitleaks CI job with the full report printed to the job log for visibility.
