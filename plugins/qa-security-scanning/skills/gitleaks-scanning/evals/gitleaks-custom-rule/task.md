# Fix our gitleaks config and prove it works

## Problem Description

Fix `.gitleaks.toml` for the problems in `notes.md` and show that the new config works.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .gitleaks.toml ===============
title = "acme gitleaks config"

[[rules]]
id = "acme-api-token"
description = "Acme API token"
regex = '''acme_(live|test)_[A-Za-z0-9]{32}'''

[allowlist]
paths = ['''tests/''']

=============== FILE: docs/api.md ===============
## Authentication

Send your token in the `Authorization` header, for example:

    Authorization: Bearer acme_test_00000000000000000000000000000000

=============== FILE: notes.md ===============
- Since we added our own `.gitleaks.toml`, a PR that committed an AWS access key and a Slack
  webhook URL passed the scan.
- The documented sample token in docs/api.md is flagged on every run.
- A real acme_live_ token in tests/fixtures/payments.json was missed last month.
