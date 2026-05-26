---
component: perf-regression-bisector
type: agent
archetype: A2
---

# perf-regression-bisector — evals

Companion eval cases for [`perf-regression-bisector`](../../perf-regression-bisector.md).
Three cases cover happy path (k6 regression → bisect → app-side hot path
hand-off), branch (Lighthouse driver instead of k6), and adversarial
(run-to-run variance exceeds the regression delta — refuse to bisect on
noise). Re-run by feeding the **Input** block as the first user message
and checking the agent's transcript against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates below are the eval-authoring date — each case
is designed to be reproducible against any tier.

## Eval 1 — happy path — k6 regression, app-side culprit

**Input:**

```
Our k6 load test `tests/perf/orders.js` started failing on the p95
latency threshold. Bisect the introducing commit.

Test definition (k6):
  threshold: http_req_duration p(95) < 500ms

Measurements:
  HEAD (sha 9f3c0e2 — current):      p95 1210 ms (over budget)
  v1.4.0 release tag (sha 4a11bbe):  p95   320 ms (under budget)

Run-to-run variance (50 iterations on HEAD):  ±35 ms (i.e. 3% of the regression delta)

Build pipeline: `npm install && npm run build && npm run start` — server
binds to localhost:3000, ready signal `npx wait-on http://localhost:3000`.

Commits between v1.4.0 and HEAD: 30.

Repo layout:
  scripts/                         present
  tests/perf/orders.js             present
  package.json (npm)               present
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 confirms determinism (variance ±35 ms is much
smaller than the 890 ms regression delta — bisect proceeds). Step 2
names bad = `HEAD` / `9f3c0e2`, good = `v1.4.0` / `4a11bbe`. Step 3
emits a per-commit measurement script that runs `npm install` →
`npm run build` → `npm run start` → `npx wait-on` → `k6 run` with
exit-code semantics 0 (within budget), non-zero (regressed), 125
(broken build) per git-bisect convention. Step 4 invokes the canonical
`git bisect start` / `git bisect bad HEAD` / `git bisect good <sha>` /
`git bisect run <script>` workflow. Step 5 hands off to
`flame-graph-analyzer` for app-side hot-path analysis. The output
explicitly names `k6 run` (not `npx lhci autorun`).

**Pass condition:** Output contains all of `git bisect start`,
`git bisect bad`, `git bisect good`, `git bisect run`, AND `k6 run`.
Output references exit code `125` (broken-build skip signal). Output
hands off to `flame-graph-analyzer` (substring match). Output does NOT
recommend running `git bisect` without the determinism check from
Step 1.

## Eval 2 — branch — Lighthouse driver instead of k6

**Input:**

```
Our Lighthouse CI started failing the Performance category score on
the home page. Bisect the introducing commit.

Lighthouse budget:
  category:performance >= 0.85

Measurements:
  HEAD (sha 7b22ee1):                performance 0.62 (over budget)
  last green CI run (sha c4d80a0):   performance 0.91 (under budget)

Run-to-run variance (10 Lighthouse runs on HEAD): ±0.02 (i.e. 7% of the regression delta of 0.29).

Build pipeline: `npm install && npm run build && npm run start` — Next.js
app binds to localhost:3000.

Commits between c4d80a0 and HEAD: 18.

Lighthouse CI is invoked via `npx lhci autorun`. We do NOT use k6 for
this front-end perf workflow.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 confirms determinism (variance is small relative
to the regression delta). Step 3 emits a per-commit measurement script
that uses `npx lhci autorun` (NOT `k6 run`) per the agent body's
"swap `k6 run` for `npx lhci autorun` to use Lighthouse" guidance.
Step 4 still invokes `git bisect start` / `bad` / `good` / `run`.
Step 5 may still hand off to `flame-graph-analyzer` for app-side
diagnosis once the culprit commit is found, but the bisect driver
itself is Lighthouse, not k6.

**Pass condition:** Output contains the literal string `npx lhci autorun`
AND `git bisect run`. Output does NOT contain `k6 run` as the
measurement-script command (`k6` may appear in references / comparisons
but not as the actual measurement invocation). Output references exit
code `125`. Output preserves the `category:performance >= 0.85` budget
or its numeric value as the bad/good signal.

## Eval 3 — adversarial — variance exceeds regression delta (refuse)

**Input:**

```
Our k6 load test `tests/perf/checkout.js` flagged a p95 regression.
Bisect the introducing commit.

Test definition (k6):
  threshold: http_req_duration p(95) < 500ms

Measurements:
  HEAD (sha 22aa55):                  p95 540 ms (over budget by 40 ms)
  last release tag (sha 11ee00):      p95 480 ms (under budget by 20 ms)

Run-to-run variance (20 iterations on HEAD): p95 480 ms ± 120 ms.

Build pipeline: standard `npm install && npm run build && npm run start`.

Commits between 11ee00 and HEAD: 40.

Proceed with the bisect.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 detects that the run-to-run variance (±120 ms) is
LARGER than the regression delta (60 ms). The agent refuses to start
`git bisect` because the bad/good signal cannot be distinguished from
noise — `git bisect run` would converge on whichever commit happened
to land on the noisier side of the distribution. Output recommends
either (a) increasing load-test duration / iterations until variance
shrinks below the delta, or (b) declaring the result INCONCLUSIVE per
the agent body's "If bisect variance exceeds the budget margin … the
result is INCONCLUSIVE" rule. Output does NOT emit a per-commit
measurement script, does NOT name a "Culprit" commit, and does NOT
issue `git bisect start`.

**Pass condition:** Output contains at least one of `variance` /
`noise` / `inconclusive` / `INCONCLUSIVE`. Output does NOT contain the
literal string `git bisect start`. Output does NOT emit a
`### Culprit` section with a specific SHA. Output recommends
increasing load-test duration / iterations OR declaring the result
inconclusive (substring `iterations` OR `duration` OR `inconclusive`).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no live
  repository or running build is required. The agent reads the
  measurements + variance stated in the input to drive Step 1.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Grep`, `Glob`, `Bash(git bisect *)`,
  `Bash(git log *)`, `Bash(git show *)`, `Bash(k6 run *)`,
  `Bash(npx lhci *)`, `Bash(jq *)`) is scoped — eval re-runs cannot
  execute arbitrary shell, modify the repository, or push commits.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
