# Our quality gate has passed 26 times in a row while the score fell 26 points

## Problem Description

In March we landed PR #2288 on `identity-svc`, titled "ci: fail the build below
60". Everyone signed it off. The weekly job has run 26 times since and reported
success 26 times.

On Wednesday I opened the September log out of idle curiosity and the score is
52.4. I pulled the history out of our build store and it has been sliding since
the week we added the thing: 78.9 in March, 70.2 in June, 58.3 in August, 52.4
now. It went under 60 somewhere in July and the job carried on saying success.

So we have had no gate since March and we did not know. `identity-svc` is
session tokens and password reset. This is the service I would least like to
have been flying blind on.

Three views so far, none of which I can evaluate:

- Ines thinks the job is reading a stale report — a cached artifact from before
  the slide — and wants a cache-busting step added on Monday.
- Hakan wants to bin it and gate on line coverage at 85 instead, on the grounds
  that the coverage job does fail builds and we know it works.
- Two people in the standup said just switch it on at 60 today, the way #2288
  said it would be, and let whatever breaks break.

The thing to know about that last one: we ship hotfixes daily out of this repo
and there is a release on Thursday. A gate that reds every build from the moment
it lands gets an exemption from someone within a day and then we are back here
in six months, except with the additional lesson that this stuff does not work.

Attached: the config, the CI workflow, the score history from the build store,
the diff from #2288, and one source file with its spec so you can see the shape
of what we write. Tell me why 26 builds passed, and give me something I can
land this week that is actually a gate.

## Output Specification

1. Edit `stryker.conf.json` and `.github/workflows/quality.yml`.
2. Write `docs/mutation-gate-postmortem.md` — why 26 runs reported success while
   the score fell 26 points, an explicit verdict on each of the three views
   above, the number you are setting and why that number, and how it moves back
   up over time.
3. Do not modify `src/session/token.js` or `test/token.spec.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: stryker.conf.json ===============
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "mocha",
  "coverageAnalysis": "perTest",
  "reporters": ["progress"],
  "mutate": ["src/**/*.js", "!src/**/*.spec.js"],
  "thresholds": { "high": 80, "low": 60 },
  "timeoutMS": 60000
}

=============== FILE: .github/workflows/quality.yml ===============
name: quality

on:
  schedule:
    - cron: '0 3 * * 1'
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx stryker run

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx nyc --check-coverage --lines 85 npm test

=============== FILE: reports/score-history.md ===============
# identity-svc — weekly mutation job, pulled from the build store 2026-09-09

Monthly samples of the 26 runs since #2288 landed. Every run in the full list,
not only these, finished with exit code 0 and a green check.

| Run date   | Build | Mutants | Score  | Line coverage | Job result | Exit code |
|------------|-------|---------|--------|---------------|------------|-----------|
| 2026-03-04 |  5510 |   1,204 | 78.9%  | 86.4%         | success    | 0         |
| 2026-04-01 |  5602 |   1,219 | 77.1%  | 86.2%         | success    | 0         |
| 2026-05-06 |  5711 |   1,266 | 74.8%  | 86.0%         | success    | 0         |
| 2026-06-03 |  5824 |   1,301 | 70.2%  | 85.9%         | success    | 0         |
| 2026-07-01 |  5930 |   1,388 | 66.5%  | 86.1%         | success    | 0         |
| 2026-08-05 |  6044 |   1,455 | 58.3%  | 86.3%         | success    | 0         |
| 2026-09-02 |  6151 |   1,502 | 52.4%  | 86.2%         | success    | 0         |

Notes from whoever wrote this script (me, Wednesday night):

- The mutant count rises every month, so each run is analysing that month's
  code, not a copy of March's.
- The only artefact any of these runs left behind is the console log. There is
  no per-file breakdown stored anywhere for any of the 26 runs, which is why I
  cannot tell you which directory the slide came from.
- The coverage job in the same workflow has failed four times this year and
  each time somebody fixed it the same day.

=============== FILE: reports/pr-2288.diff ===============
commit 41c0e8d  ci: fail the build below 60 (#2288)
Author: Hakan   Date: 2026-03-02

 .github/workflows/quality.yml |  14 ++++++++
 stryker.conf.json             |   8 ++++++
 2 files changed, 22 insertions(+)

--- /dev/null
+++ b/stryker.conf.json
@@
+{
+  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
+  "packageManager": "npm",
+  "testRunner": "mocha",
+  "coverageAnalysis": "perTest",
+  "reporters": ["progress"],
+  "mutate": ["src/**/*.js", "!src/**/*.spec.js"],
+  "thresholds": { "high": 80, "low": 60 },
+  "timeoutMS": 60000
+}

--- a/.github/workflows/quality.yml
+++ b/.github/workflows/quality.yml
@@
+  mutation:
+    runs-on: ubuntu-latest
+    timeout-minutes: 45
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with:
+          node-version: 20
+          cache: npm
+      - run: npm ci
+      - run: npx stryker run

Review comment from Ines, approved 2026-03-02: "60 feels about right as a floor,
we were at 78 last week so there is plenty of headroom. Ship it."

=============== FILE: src/session/token.js ===============
const MAX_AGE_SECONDS = 900;
const CLOCK_SKEW_SECONDS = 30;

function isExpired(issuedAtSeconds, nowSeconds) {
  return nowSeconds - issuedAtSeconds > MAX_AGE_SECONDS + CLOCK_SKEW_SECONDS;
}

function remainingSeconds(issuedAtSeconds, nowSeconds) {
  const left = MAX_AGE_SECONDS - (nowSeconds - issuedAtSeconds);
  return left > 0 ? left : 0;
}

function shouldRefresh(issuedAtSeconds, nowSeconds) {
  return remainingSeconds(issuedAtSeconds, nowSeconds) < MAX_AGE_SECONDS / 3;
}

module.exports = { isExpired, remainingSeconds, shouldRefresh, MAX_AGE_SECONDS };

=============== FILE: test/token.spec.js ===============
const assert = require('node:assert/strict');
const { isExpired, remainingSeconds, shouldRefresh } = require('../src/session/token');

describe('token', () => {
  it('is not expired immediately after issue', () => {
    assert.equal(isExpired(1000, 1000), false);
  });

  it('is expired long after issue', () => {
    assert.equal(isExpired(1000, 99999), true);
  });

  it('reports some time remaining on a fresh token', () => {
    assert.ok(remainingSeconds(1000, 1010) > 0);
  });

  it('does not ask for a refresh on a fresh token', () => {
    assert.equal(shouldRefresh(1000, 1010), false);
  });
});
