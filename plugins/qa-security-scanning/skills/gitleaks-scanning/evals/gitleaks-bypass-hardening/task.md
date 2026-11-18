# Our gitleaks controls are easy to bypass

## Problem Description

An audit found our gitleaks controls are easy to bypass (`docs/audit.md`, `.githooks/pre-commit`, `.github/workflows/secrets.yml`). Harden the setup.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .githooks/pre-commit ===============
#!/usr/bin/env bash
gitleaks protect --staged -v || {
  echo "gitleaks found something. If it is a false positive add '#gitleaks:allow' to the line."
  exit 1
}

=============== FILE: .github/workflows/secrets.yml ===============
name: secrets
on: [pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    continue-on-error: true        # don't block merges on false positives
    steps:
      - uses: actions/checkout@v5
      - run: gitleaks detect --source . --log-opts="-1" -v

=============== FILE: docs/audit.md ===============
Internal audit, secrets controls:
- 37 lines in the repo carry `#gitleaks:allow`; 5 of them hide real credentials (one added to make a release go through).
- Developers commit with `--no-verify` or `SKIP=gitleaks` when the hook is slow.
- The CI job never blocks a merge and only looks at one commit, so a PR whose second-to-last commit adds a key passes.
- Security wants exceptions reviewed by the security team, not by whoever writes the code.
