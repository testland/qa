# INC-4417 follow-up: the bot merged a minor bump at 02:06 and took checkout down

## Problem Description

Incident INC-4417. A dependency pull request bumping `fastify` 5.2.1 to 5.3.0
was opened at two in the morning our time and merged by automation six minutes
later. Our deploy pipeline ships on every merge to `main`, so it went out.
Checkout returned 500s for 38 minutes. We are in Auckland; the timeline is
attached and has both clocks on it.

Rafa (engineering manager) wants three things out of the follow-up:

1. "Keep the automation. Ninety percent of what it merges is fine and I am not
   putting two engineers back on clicking merge."
2. "Keep `--admin` on the merge. Our end-to-end suite takes forty minutes. If
   the bot has to sit and wait for it, the small bumps pile up all morning and
   we are back to babysitting a queue."
3. "And stop them landing overnight. On-call got paged at 02:11 for something
   nobody chose to ship. I want them opening at 09:00 on a weekday so a human
   is awake when they appear — just move the time in the file to 09:00."

Rewrite the automation so INC-4417 cannot repeat. Rafa will read the follow-up
document himself and he argues with everything, so whatever you conclude has to
be carried by what is in the timeline rather than by assertion. Attached: the
workflow, the update settings file, and the incident record.

## Output Specification

1. Rewrite `.github/workflows/dependabot-automerge.yml`.
2. Update `.github/dependabot.yml`.
3. Write `docs/inc-4417-followup.md`: what merged a pull request whose required
   check had not finished, every change you made and why, and a numbered
   response to each of Rafa's three points saying plainly where each one ends
   up.
4. `test/automerge-workflow.test.js` must still pass under `node --test`.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/dependabot-automerge.yml ===============
name: Dependabot auto-merge
on: pull_request_target

permissions: write-all

jobs:
  automerge:
    runs-on: ubuntu-latest
    steps:
      - uses: dependabot/fetch-metadata@v2
        id: meta
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Merge it
        if: steps.meta.outputs.update-type != 'version-update:semver-major'
        run: gh pr merge --admin --merge "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

=============== FILE: .github/dependabot.yml ===============
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
      time: "14:00"
    open-pull-requests-limit: 10
    labels: ["dependencies"]

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

=============== FILE: docs/inc-4417.md ===============
# INC-4417 - checkout 500s

| UTC (2026-09-02) | Local (2026-09-03) | Event                                                        |
|------------------|--------------------|--------------------------------------------------------------|
| 14:02            | 02:02              | Pull request #8812 opened: `fastify` 5.2.1 -> 5.3.0          |
| 14:03            | 02:03              | CI starts. Unit + lint green in 90s. End-to-end job starts.  |
| 14:06            | 02:06              | `Dependabot auto-merge` workflow merges #8812 into `main`.   |
| 14:08            | 02:08              | End-to-end job reports failure: 14 checkout specs red.       |
| 14:09            | 02:09              | Deploy pipeline (triggers on merge to `main`) ships 4471.    |
| 14:11            | 02:11              | Error rate on `POST /checkout` hits 100%. On-call paged.     |
| 14:49            | 02:49              | Revert deployed. Error rate normal.                          |

Cause: fastify 5.3.0 changed the default `bodyLimit` handling for
`application/json` requests. Our checkout payloads exceed the new default. This
is a behaviour change in a minor release; the release notes mention it.

Notes gathered afterwards:

- Auto-merge is enabled at the repository level. Branch protection on `main`
  requires the end-to-end job.
- The `time: "14:00"` line was added in a 2025 pull request titled "move
  dependency PRs to after lunch".
- The end-to-end job has caught 3 bad dependency bumps in the last 6 months.
- The workflow merged 47 dependency pull requests in August. 42 of them were
  patch bumps.
- 5 of those 47 did not come from the daily run: each was opened within an hour
  of a published advisory for the package concerned, and 3 of the 5 were merged
  between 01:00 and 04:00 local.

=============== FILE: test/automerge-workflow.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const WORKFLOW = '.github/workflows/dependabot-automerge.yml';
const CONFIG = '.github/dependabot.yml';

test('auto-merge workflow still exists', () => {
  assert.ok(fs.existsSync(WORKFLOW), 'workflow file missing');
});

test('workflow reads update metadata before deciding', () => {
  assert.match(fs.readFileSync(WORKFLOW, 'utf8'), /dependabot\/fetch-metadata/);
});

test('workflow declares at least one job on a runner', () => {
  const src = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(src, /^jobs:/m);
  assert.match(src, /\n\s+runs-on:\s*\S+/);
});

test('neither file uses tab indentation', () => {
  for (const f of [WORKFLOW, CONFIG]) {
    assert.ok(!fs.readFileSync(f, 'utf8').includes('\t'), `${f} contains a tab`);
  }
});

test('update settings still declare schema version 2', () => {
  assert.match(fs.readFileSync(CONFIG, 'utf8'), /^version:\s*2\s*$/m);
});
