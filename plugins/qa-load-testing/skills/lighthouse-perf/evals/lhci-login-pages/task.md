# Lighthouse scores for the dashboard look like the login page

## Problem Description

Our Lighthouse CI scores for the dashboard look like the login page, and results jump around between runs (`lighthouserc.json`, `docs/perf-notes.md`). Fix the config and add whatever script it needs.

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
        "https://staging.example.com/dashboard",
        "https://staging.example.com/reports"
      ],
      "numberOfRuns": 1
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
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}

=============== FILE: docs/perf-notes.md ===============
- /dashboard and /reports need a login (form at /login, email + password). The SPA keeps the
  session token in localStorage.
- Reports for /dashboard look exactly like our login page.
- The performance score swings between 0.78 and 0.95 on the same commit.
- These pages show customer names and revenue figures.
