# Update our fuzz script for Schemathesis 4

## Problem Description

Update `ci/fuzz.sh` for Schemathesis 4 (`notes.md`) without losing anything the old flags did.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: ci/fuzz.sh ===============
#!/usr/bin/env bash
set -euo pipefail
schemathesis run http://localhost:8000/openapi.json \
  --base-url http://localhost:8000/api \
  --checks all \
  --hypothesis-max-examples 50 \
  --hypothesis-seed 1234 \
  --request-timeout 5000 \
  --stateful=links \
  --junit-xml reports/schemathesis.xml \
  --exitfirst

=============== FILE: requirements-dev.txt ===============
schemathesis>=4.0,<5

=============== FILE: notes.md ===============
- We upgraded Schemathesis from 3.39 to 4.x and the CI job now fails while parsing options.
- The 5-second request timeout matters: once a hung endpoint kept the job waiting, and 5 s is the limit we agreed on.
- CI reads the JUnit file from reports/schemathesis.xml for the test report.
