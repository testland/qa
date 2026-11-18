Internal audit, secrets controls:
- 37 lines in the repo carry `#gitleaks:allow`; 5 of them hide real credentials (one added to make a release go through).
- Developers commit with `--no-verify` or `SKIP=gitleaks` when the hook is slow.
- The CI job never blocks a merge and only looks at one commit, so a PR whose second-to-last commit adds a key passes.
- Security wants exceptions reviewed by the security team, not by whoever writes the code.
