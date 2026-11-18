# Our Lighthouse CI assert step errors out before checking anything

## Problem Description

Our Lighthouse CI assert step errors out before checking anything (`lighthouserc.json`, `budget.json`). Make it enforce the budgets in `docs/budgets.md`.

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
        "http://localhost:3000/",
        "http://localhost:3000/checkout",
        "http://localhost:3000/blog/launch"
      ]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "budgetsFile": "budget.json",
      "assertions": {
        "largest-contentful-paint": [
          "error",
          {
            "maxNumericValue": 2500
          }
        ]
      }
    }
  }
}

=============== FILE: budget.json ===============
[
  {
    "path": "/*",
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 300
      }
    ]
  }
]

=============== FILE: docs/budgets.md ===============
- JavaScript: at most 300 KB on `/` and `/checkout`; marketing pages under `/blog/` may use up to 500 KB.
- LCP at most 2.5 s everywhere.
- The assert step currently fails with a configuration error before checking anything.
