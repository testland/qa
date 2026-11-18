# Nightly fuzzing turns into a wall of 401s after ten minutes

## Problem Description

Our nightly Schemathesis job (`.github/workflows/fuzz.yml`, notes in `docs/fuzz-notes.md`) turns into a wall of 401s after ten minutes and never caught the negative-quantity bug. Fix the setup.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .github/workflows/fuzz.yml ===============
name: nightly-fuzz
on:
  schedule: [{ cron: "17 2 * * *" }]
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: pip install schemathesis
      - run: >
          schemathesis run https://staging.example.com/openapi.json
          --url https://staging.example.com
          -H "Authorization: Bearer ${{ secrets.STAGING_TOKEN }}"
          --checks not_a_server_error
          --mode positive

=============== FILE: docs/fuzz-notes.md ===============
- STAGING_TOKEN is an access token we copy in by hand; tokens expire after 10 minutes.
  Tokens come from POST /auth/token with client_id and client_secret (JSON body), field `access_token`.
- The run takes about 40 minutes; after the first 10 minutes every request gets 401.
- Production bug last month: POST /orders accepted `quantity: -3` and refunded money.
  The spec says `quantity: {type: integer}`.
