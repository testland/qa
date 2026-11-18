# gitleaks missed a real AWS key and a Slack token

## Problem Description

gitleaks missed a real AWS key and a Slack token (`docs/incident.md`). Fix `.gitleaks.toml` and `.github/workflows/secrets.yml` so this can't happen again, and show how you'd prove the config catches them.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .gitleaks.toml ===============
title = "company rules"

[[rules]]
id = "internal-api-key"
description = "Internal API key"
regex = '''ik_[a-z0-9]{32}'''

[allowlist]
description = "test files and docs"
paths = ['''.*test.*''', '''.*\.md''']
regexes = ['''AKIA[0-9A-Z]{16}''']   # example keys in our docs

=============== FILE: .github/workflows/secrets.yml ===============
name: secrets
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

=============== FILE: docs/incident.md ===============
Last month a real AWS access key and a Slack bot token were committed in
`src/config/test_settings.py` and pushed in a PR with 6 commits. The gitleaks job stayed green.
The repository belongs to our GitHub organization.
