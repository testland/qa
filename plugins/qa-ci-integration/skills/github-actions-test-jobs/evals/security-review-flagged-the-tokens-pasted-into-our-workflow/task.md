# Security review flagged the tokens someone pasted into our workflow

## Problem Description

`wavelet-cli` is our open-source CLI. Public repo, 31 forks, MIT, and we take a
steady trickle of outside contributions. Last week's security review flagged the
test workflow; the finding is attached along with the workflow itself and the
`git log` for that file.

The short version: when Tom set up the publish step in July he pasted the npm
token and our Slack webhook straight into the YAML. They have been sitting in a
public repository for seven weeks. I need this cleaned up today and I need to be
able to tell the reviewer on Friday exactly what we did, in writing, without a
second round.

Tom has written up what he wants to do this afternoon. He is the one who got us
here and he has been thorough since, so I am inclined to say yes, but I want a
second opinion first. His four items:

1. Every value under an `env:` key moves into repository secrets. The token, the
   webhook, the database URL, the Postgres password, `CI`, the timezone, all of
   it. Nothing readable stays in that file.
2. Force-push `main` with the token line deleted, so it is out of the history and
   we are back to clean.
3. Switch the `on: pull_request` trigger to `on: pull_request_target`. This is
   the one he is proudest of, because it also closes issue #488, attached -
   outside contributors have not been able to get a green run for two weeks,
   which is embarrassing on a project that asks for contributions. He has tried
   it on his own fork and the run comes back green.
4. Add a `permissions:` block at the top of the file so the automatic token the
   workflow gets is read-only unless a job asks for more.

Tell me which of those four to let him do, do the parts that should be done, and
be specific about anything else the reviewer will want from us - I would rather
hear it now than on Friday.

One constraint. The integration job runs against a throwaway Postgres container
that GitHub creates for the duration of the job and destroys with it; there is no
database of ours behind it, and it has to still work when you are done.

## Output Specification

1. Rewrite `.github/workflows/test.yml`. The integration job must still be able
   to reach its database, and `npm publish` on `main` must still be able to
   authenticate against the registry.
2. Write `docs/secret-remediation.md`: a verdict on each of Tom's four items with
   the reason, a row for every value currently sitting under an `env:` key in
   that workflow with a verdict for each one, what we are doing about issue #488,
   and the steps we owe the reviewer by Friday.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/test.yml ===============
name: test

on:
  pull_request:
  push:
    branches: [main]

env:
  CI: true
  TZ: UTC
  NPM_TOKEN: npm_FIXTUREnotarealtoken00000000000000
  SLACK_WEBHOOK: https://hooks.slack.com/services/T00000000/B00000000/FIXTUREnotarealwebhook

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test
      - name: Label the run
        run: ./scripts/label-run.sh "${{ github.event.pull_request.title }}"
      - name: Report to the dashboard
        run: ./scripts/report.sh
        env:
          DASHBOARD_TOKEN: ${{ secrets.DASHBOARD_TOKEN }}

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: ci_local_only
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:ci_local_only@localhost:5432/postgres

  publish:
    runs-on: ubuntu-latest
    needs: [test, integration]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm publish
      - run: ./scripts/notify.sh "wavelet-cli published"

=============== FILE: reports/security-review-2026-09-04.md ===============
# Security review - wavelet-cli - 04 Sep 2026

Repository: public, 31 forks, 604 stars. Default branch `main`.

| # | Finding                                                              | Severity |
|---|----------------------------------------------------------------------|----------|
| 1 | Live npm publish token committed in `.github/workflows/test.yml`      | Critical |
| 2 | Live Slack incoming-webhook URL committed in the same file            | High     |
| 3 | Workflow-level `env:` exposes every value to every job and every step | Low      |
| 4 | Pull-request metadata expanded inside a `run:` command string         | Medium   |

Reviewer note on findings 1 and 2: "Relocating the values is not remediation on
its own. Tell me what was done about the exposure, not only about the file. Our
checklist wants the answer to that question in writing before this closes."

Reviewer note on finding 4: "Flagged mechanically by the scanner. I have not
assessed it; include your own assessment in the reply."

=============== FILE: reports/issue-488.md ===============
# Issue #488 - CI fails on every pull request from a fork

Opened 28 Aug 2026 by @kamil-w (not a member of this organisation)

> My PR #486 has failed on every push for two weeks and the log is identical
> every time. My branch touches `src/wave.mjs` and one test file. It does not go
> anywhere near publishing. Am I doing something wrong?

Log excerpt from the latest failure on #486:

```
  Run npm test
    ok 1 - parses seconds
    ok 2 - parses hours
    ok 3 - rejects nonsense
    ok 4 - formats the largest whole unit
    ok 5 - round-trips
  Run ./scripts/label-run.sh "fix: reject negative durations"
  Run ./scripts/report.sh
    report.sh: DASHBOARD_TOKEN is empty, refusing to post
    Error: Process completed with exit code 1
```

Two maintainers have confirmed the same PR passes when they push the identical
branch from a branch on this repository rather than from a fork.

=============== FILE: reports/git-log.txt ===============
$ git log --oneline --follow .github/workflows/test.yml
9c41ab2 2026-07-16 tom.k  ci: publish to npm on main
5f7de10 2026-06-02 tom.k  ci: add integration job with postgres service
a0ce884 2026-05-19 dana.r ci: run the suite on pull requests

$ git log --format='%H %ad' -1 9c41ab2
9c41ab29d0e4b7c8a1f3e6b20d5c7a84f9e1b3c6 Thu Jul 16 09:22:41 2026 +0000

$ gh api repos/wavelet/wavelet-cli --jq '.forks_count, .visibility'
31
public

=============== FILE: package.json ===============
{
  "name": "wavelet-cli",
  "version": "3.0.2",
  "license": "MIT",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "test:integration": "node --test integration/*.test.mjs"
  }
}

=============== FILE: src/wave.mjs ===============
export function parseDuration(text) {
  const m = /^(\d+)(ms|s|m|h)$/.exec(text.trim());
  if (!m) throw new SyntaxError(`not a duration: ${text}`);
  const unit = { ms: 1, s: 1000, m: 60000, h: 3600000 }[m[2]];
  return Number(m[1]) * unit;
}

export function formatDuration(ms) {
  if (ms % 3600000 === 0) return `${ms / 3600000}h`;
  if (ms % 60000 === 0) return `${ms / 60000}m`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

=============== FILE: test/wave.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatDuration } from '../src/wave.mjs';

test('parses seconds', () => {
  assert.equal(parseDuration('30s'), 30000);
});

test('parses hours', () => {
  assert.equal(parseDuration('2h'), 7200000);
});

test('rejects nonsense', () => {
  assert.throws(() => parseDuration('soon'), SyntaxError);
});

test('formats the largest whole unit', () => {
  assert.equal(formatDuration(7200000), '2h');
  assert.equal(formatDuration(90000), '90s');
  assert.equal(formatDuration(250), '250ms');
});

test('round-trips', () => {
  for (const text of ['500ms', '45s', '15m', '3h']) {
    assert.equal(formatDuration(parseDuration(text)), text);
  }
});
