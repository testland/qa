# The INP assertion in Lighthouse CI never measures anything

## Problem Description

We want CI to catch slow interactions on our search page, but the Lighthouse CI INP assertion never measures anything (`lighthouserc.json`, `docs/perf.md`). Make CI check interaction responsiveness properly.

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
        "http://localhost:3000/search"
      ],
      "numberOfRuns": 3,
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": [
          "error",
          {
            "maxNumericValue": 2500
          }
        ],
        "interaction-to-next-paint": [
          "error",
          {
            "maxNumericValue": 200
          }
        ],
        "cumulative-layout-shift": [
          "error",
          {
            "maxNumericValue": 0.1
          }
        ]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}

=============== FILE: docs/perf.md ===============
- Product goal: typing in the search filter must feel instant. Search Console shows INP "needs improvement" on /search.
- Lighthouse CI never reports a value for interaction-to-next-paint; the job is flaky about it.
- The filter box is `#filter`; results render into `#results` after each keystroke.
