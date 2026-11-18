# Desktop admin app gets phone screenshots and 30-point score swings

## Problem Description

Lighthouse CI for our desktop-only admin app shows phone screenshots and the score swings by 30 points on the same commit (`lighthouserc.json`, `.github/workflows/perf.yml`, `docs/notes.md`). Fix the setup.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: lighthouserc.json ===============
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:8080/admin/reports"
      ],
      "numberOfRuns": 1,
      "settings": {
        "formFactor": "desktop",
        "throttlingMethod": "devtools"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": [
          "error",
          {
            "minScore": 0.9
          }
        ]
      }
    }
  }
}

=============== FILE: .github/workflows/perf.yml ===============
name: perf
on: [pull_request]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci && npm run build
      - run: npx @lhci/cli@0.15.x autorun

=============== FILE: docs/notes.md ===============
- The admin app is desktop-only (min width 1280px). The screenshots in the LHCI report look like a phone.
- Performance score swings between 0.62 and 0.91 on the same commit; the team wants to stop rerunning jobs.
- We switched to devtools throttling because "it is more realistic".
