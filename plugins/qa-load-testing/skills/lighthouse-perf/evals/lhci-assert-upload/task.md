# Set up a Lighthouse performance gate on our PRs

## Problem Description

Fix `lighthouserc.js` for the problems in `notes.md`. We want a performance gate on PRs.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: lighthouserc.js ===============
module.exports = {
  ci: {
    collect: {
      url: [
        'https://staging.example.com/',
        'https://staging.example.com/account?session=8f3a2c91e7',
      ],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: notes.md ===============
- PRs fail on dozens of audits nobody asked for (unminified CSS, image formats, and more).
- LCP fails on one run and passes on the next with no code change.
- Security asked why reports of our staging account page are reachable on a public URL.
- The account page needs a logged-in user.
