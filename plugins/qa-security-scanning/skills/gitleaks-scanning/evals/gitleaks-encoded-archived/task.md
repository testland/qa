# gitleaks missed three leaks it should have caught

## Problem Description

gitleaks missed three leaks (`docs/incident.md`). Fix `.gitleaks.toml` and `.github/workflows/secrets.yml` so each of them would be caught, and show how to prove it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .gitleaks.toml ===============
title = "acme"
[extend]
useDefault = true

[[rules]]
id = "acme-service-token"
description = "Acme internal service token"
regex = '''acme_(?=live|stg)[a-z]{3,4}_[A-Za-z0-9]{40}'''
keywords = ["acme_"]

[[allowlists]]
description = "lockfiles and generated files"
paths = ['''(.*?)(json|ya?ml|lock)$''']

=============== FILE: .github/workflows/secrets.yml ===============
name: secrets
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 0 }
      - run: |
          curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz | tar xz
          ./gitleaks git --report-format sarif --report-path gitleaks.sarif

=============== FILE: docs/incident.md ===============
Three leaks reached main without a finding:
1. k8s/payments-secret.yaml: a Kubernetes Secret with the Stripe live key in `data:` (base64).
2. test/fixtures/legacy-config.zip: an old .env with a database password, zipped for a migration test.
3. services/billing/client.go: an `acme_live_...` service token. The custom rule was added for exactly this.
The CI log also shows: "error parsing regexp: invalid or unsupported Perl syntax: `(?=`".
