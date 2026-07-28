---
name: test-suite-health-audit
description: "Measures an existing test suite's current state on four axes: per-file tier classification (unit / integration / E2E, first match wins), pyramid ratio against whatever target the team already committed to, per-layer flake rate, and defects-caught-per-run-minute ROI per tier, then reduces them to one categorical verdict (Healthy, Needs pruning, Needs refactor, Cannot assess). Reports severity against a target ratio but never prescribes one: choosing the target unit:integration:E2E mix and the rebalancing plan belongs to a pyramid-balancing capability such as `test-pyramid-balancer`. Use when a suite has grown for a year or more without review and someone needs a defensible read on whether it is healthy, over-grown, or structurally inverted before deciding what to delete or rewrite."
---

# test-suite-health-audit

## What this owns, and what it does not

This audit owns **the measurement layer**: how each test file is assigned a
tier, how the observed ratio is compared to a target, how flake rate and return
per tier are banded into severities, and how those severities reduce to a single
categorical verdict.

It deliberately does **not** own:

| Not owned | Where it belongs |
|---|---|
| The recommended target ratio, and the plan for getting back to it | A pyramid-balancing capability such as `test-pyramid-balancer`. That capability decides what the mix *should* be for a given codebase and produces the rebalancing recommendation. This audit consumes a target and reports distance from it. |
| Classifying the *change set* (which layers recent commits touch) | A change-shape classifier such as `code-change-shape-classifier`. That answers "what kind of work is this team doing?"; this answers "what does the suite that already exists look like?" Do not re-derive either one inside the other. |
| Per-file review of selector fragility, assertion specificity, mocking technique, or naming | Reviews scoped to a single file. This audit counts and bands whole layers; it does not open a test and argue about a locator. |

Read the boundary this way: if the question is **what the ratio should be**, that
is the balancing decision and this audit does not answer it. If the question is
**what the ratio is, and how far that is from the number the team already
agreed to**, that is this audit.

The audit needs a target as input. If the team documented one, use it verbatim.
If it did not, say plainly in the output which target you applied and that the
team never committed to it, because the severity numbers below are meaningless
without naming the baseline they are measured against.

## Step 1 - Classify each test file by tier

Apply the rules in order. **First match wins**, so a file under `e2e/` that also
imports a database driver is E2E, not integration.

| Tier | Matches when any of these hold |
|---|---|
| **E2E** | Path contains `e2e/`, `end-to-end/`, `cypress/`, `playwright/`, `webdriver*/`, `appium/`, or `selenium/`; or the file imports `@playwright/test`, `cypress`, `selenium-webdriver`, `puppeteer`, or `webdriverio`; or it drives the system as a black box through HTTP or a GUI driver. |
| **Integration** | Path contains `integration/`, `it/`, or `contract/`; or the file imports a database driver, an ORM, a message-broker client, an HTTP server fixture, or a container-fixture library; or it exercises more than one unit of the system under test in one process. |
| **Unit** | None of the above. The file imports the module under test and its in-process collaborators only, with no out-of-process dependency. |

An explicit team convention outranks all three rules. If the suite tags tiers
through a runner marker, a config-level project split, or a directory contract,
read the tag and use it: the heuristic exists only for suites that never
declared one.

The E2E and integration rows lean on the same distinction the pyramid draws:
unit tests have "the narrowest scope of all the tests in your test suite", while
work that crosses a serialization boundary, including "reading from and writing
to databases" and calls to another application's API, is integration territory
([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)).

### The classification is a heuristic, and it will be wrong sometimes

Path-based tiering labels **location, not behavior**. A test sitting under a
`unit/` directory that opens a real database connection is an integration test,
because reading from and writing to a database is exactly what the cited source
puts in the integration bucket
([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)).
The reverse also happens: a file under `integration/` that stubs every
collaborator is a unit test wearing the wrong directory.

The import-signal rules in the table above catch the common cases and miss the
clever ones, such as a test that imports nothing suspicious but starts an
in-process HTTP server in a fixture. Two consequences follow, and both belong in
the output:

1. **Report a confidence figure**, not just a count: the share of files that
   matched a rule cleanly, excluding files that matched contradictory signals or
   matched nothing at all.
2. **Never present the ratio as exact.** It is an estimate with a stated
   confidence, and every downstream severity inherits that uncertainty.

A team that needs exact tiering should add explicit tier markers. Say so in the
output rather than pretending the heuristic is a measurement.

## Step 2 - Compare the ratio to the target

Compute the per-layer share of total test files (or of total test cases, if the
count is available: state which one you used, because the two diverge when one
E2E file holds thirty scenarios). Then compute the signed delta in percentage
points against the target for each layer.

| Condition | Axis severity |
|---|---|
| Every layer within 10 percentage points of target | Healthy |
| Worst layer between 10 and 25 percentage points off | Minor |
| Worst layer more than 25 percentage points off | Important |
| **E2E file count exceeds unit file count** (the pyramid is inverted) | Critical, and it overrides every band above |

**What is grounded and what is convention here.** The inversion rule is
grounded: the cited source warns against a top-heavy "test ice-cream cone", and
the pyramid's premise is "many more low-level UnitTests than high level
BroadStackTests running through a GUI"
([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html);
[Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)). A suite
with more E2E files than unit files has inverted that premise, so it earns the
top severity regardless of arithmetic.

The **10 and 25 percentage-point cuts are conventions of this audit**, not
values published by any source. Their reasoning: the pyramid is explicitly a
heuristic whose proportions vary by codebase and team, so a small deviation
carries no information and should not generate a finding at all. Ten points is
roughly the width of the disagreement between reasonable published targets for
the same codebase, which makes it the smallest gap worth reporting. Twenty-five
points is the width at which a layer's share has changed category rather than
drifted: a layer targeted at 20 percent sitting at 45 percent is not a tuning
problem, it is a different suite. Substitute your own cuts if you have
historical data; keep them fixed across audits so consecutive reports compare.

Do not convert this into a recommendation for a new target. Report the delta and
the severity, and hand the rebalancing decision to whatever owns it.

## Step 3 - Per-layer flake rate

For each tier, compute the share of runs that failed without an accompanying
code change, over a fixed window of recent runs. A run counts as flaky under the
cited definition: "A test is non-deterministic when it passes sometimes and
fails sometimes, without any noticeable change in the code, tests, or
environment"
([Fowler, Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)).

| Per-layer flake rate | Axis severity | Recommended posture |
|---|---|---|
| Under 2% | Healthy | No action. |
| 2% to 5% | Minor | Track; do not block a release on it. |
| 5% to 15% | Important | Quarantine the offenders and schedule the fix. |
| Over 15% | Critical | The layer's signal is no longer readable. |

**These four bands are practitioner conventions.** No standard defines them, and
no cited source publishes a numeric flake threshold. Each cut has a reason, and
the reason is what you should argue with, not the number:

- **The 2% floor is set by measurement resolution, not by quality.** A 50-run
  window cannot distinguish anything finer than one failure in fifty, which is
  2%. Below that cut you are reporting "no flake observed in the window", which
  is a different statement from "the flake rate is low". Widen the window if you
  need finer resolution, and move the floor with it.
- **The 5% cut is where the cost becomes routine rather than occasional.** At
  one failure in twenty runs, a developer who opens twenty pull requests in a
  sprint will hit a false red at least once. That is frequent enough to teach
  the habit of re-running, and the habit is the damage.
- **The 15% cut is where the layer stops functioning as a regression signal.**
  At roughly one failure in six, a red result carries almost no information, and
  the cited source describes exactly where that leads: once a team starts
  disregarding a regression test failure, the test has lost its value, because
  nobody can separate a real defect from noise anymore
  ([Fowler, Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)).
  That article also warns that quarantine is a holding action rather than a fix,
  and recommends bounding it with a hard cap on count or on age so quarantined
  tests do not become permanent.

If no per-run history exists, this axis emits `not assessed` and the audit
continues. A missing flake number is not a Healthy flake number, and the output
must not let a reader confuse the two.

## Step 4 - ROI per tier

For each tier, compute:

```
roi(layer) = defects_caught(layer) / total_run_minutes(layer)
```

`total_run_minutes` is the layer's wall-clock cost across the same window used
in Step 3. `defects_caught` has no direct measurement, so use a proxy: the count
of defect-fix or revert changes in the window that were accompanied by a change
to a test in that layer. State which proxy you used and its window.

Then flag any layer whose ROI is **below 10 percent of the best-scoring layer**
as a prune-or-refactor candidate.

**This ratio and its 10 percent cut are practitioner conventions.** The
reasoning for the cut is the weakness of the proxy: a defect-fix-commit count
under-counts badly (it misses defects caught before commit, and misses layers
whose tests are edited without a fix marker), so a small ROI gap between two
layers is indistinguishable from proxy noise. Setting the flag an order of
magnitude below the best layer means only a gap far larger than the proxy's
error can trigger a recommendation to delete tests. Deleting tests on a weak
signal is the expensive mistake here, so the cut is deliberately conservative.

What *is* grounded is the ordering the ratio tends to produce, and why: cost and
execution speed increase as you move up the layers, unit tests "run very fast"
while end-to-end tests "require a lot of maintenance and run pretty slowly"
([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)),
and UI-driven tests are "brittle, expensive to write, and time consuming to run"
([Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)). So the
denominator grows sharply toward the top of the pyramid. The numerator does not
move the same way: the counter-argument is that "as you move up the pyramid, the
confidence quotient of each form of testing increases" and that "integration
tests strike a great balance on the trade-offs between confidence and
speed/expense"
([Dodds, Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests)).
Expect the middle layer to score well and expect a bottom-heavy suite of trivial
unit tests to score worse than its file count suggests. Neither expectation is a
target: report what the numbers say.

A low-ROI *unit* layer is a different finding from a low-ROI *E2E* layer. Cheap
tests with low return are usually redundant and can be pruned; expensive tests
with low return are usually testing the wrong thing at the wrong level and want
rewriting. Say which one you found.

## Step 5 - Reduce to one verdict

Evaluate in order. The first matching row is the verdict.

| Verdict | Condition |
|---|---|
| **Cannot assess** | Any un-assessable condition below holds. |
| **Needs refactor** | Any Critical severity: the pyramid is inverted, or a layer's flake rate is over 15%. |
| **Needs pruning** | No Critical, but at least one Important finding that is an *excess*: a layer more than 25 points over its target share, or a layer flagged in Step 4 as low-ROI. |
| **Needs refactor** | No Critical, but at least one Important finding that is a *deficit* or a quality problem: a layer more than 25 points under its target share, or a layer with 5% to 15% flake. |
| **Healthy** | Everything else. Minor findings are reported and do not change the verdict. |

The pruning-versus-refactor split is a convention of this audit, and the line is
the shape of the remediation, not its size: **pruning** means the fix is
deletion (there is too much of something that returns little), while **refactor**
means the fix is rewriting or moving tests (the coverage exists at the wrong
level, or exists but cannot be trusted). Splitting on remediation shape is what
makes the verdict actionable, because the two land on different people in
different sprints.

### What makes a suite un-assessable

Emit `Cannot assess` and name which condition fired. Do not emit a softened
verdict instead: an audit that guesses is worse than one that abstains, because
the guess gets quoted later without its caveat.

| Condition | Why it blocks a verdict |
|---|---|
| **Fewer than 3 test files** | A ratio computed over one or two files is arithmetic, not evidence. A single file moves the share by tens of points. |
| **Tier classification confidence below 80%** | If one file in five could not be tiered cleanly, the ratio's error bar is wider than the 10-point band that separates Healthy from Minor, so every severity in Step 2 is unfalsifiable. |
| **No target ratio, documented or agreed** | Severity in Step 2 is defined as distance from a target. With no target there is no distance, only a distribution. Report the distribution and stop. |
| **A single framework or a single file was the actual question** | Whole-suite ratios say nothing useful about one framework's internal architecture or one file's quality. Those are different reviews with different inputs. |

When you emit `Cannot assess`, name the **specific input that would unlock it**:
a tier-marker convention, a directory split, a runner config tag, a documented
target ratio, or a larger sample. "Insufficient data" without that sentence is
not a useful output.

## Output format

Emit one Markdown block, in this order.

```markdown
## Suite health verdict: <Healthy | Needs pruning | Needs refactor | Cannot assess>

**Suite:** <identifier>   **Window:** <dates, run count>
**Target ratio applied:** <unit/int/e2e> (<documented by the team | applied as a
default because none was documented>)
**Tier classification confidence:** <n>% of <total> files tiered cleanly

| Axis | Severity | Finding | Remediation shape |
|---|---|---|---|
| Tier classification | <severity or n/a> | <% clean, what defeated the rest> | <add tier markers / keep> |
| Pyramid ratio | <severity> | <actual vs target, signed delta per layer> | <prune / add / keep> |
| Flake rate per layer | <severity or not assessed> | <rate per layer, or the missing input> | <quarantine / keep> |
| ROI per tier | <severity or not assessed> | <ratio per layer, which layer is the reference> | <prune / rewrite / keep> |

## Top 3 findings

1. <largest blast radius first, naming the axis and the number behind it>
2. <second>
3. <third>

## Not assessed

- <every axis that emitted `not assessed`, with the input that would fix it>
- <the confidence gap, if classification landed under 100%>

## Not decided here

The target ratio and the rebalancing plan are a separate decision. This report
measures distance from the target named above; it does not propose a new one.
```

Keep the last section even when it feels redundant. It is what stops a reader
from treating a measurement as a mandate.

## Worked examples and anti-patterns

Three worked runs (inverted pyramid, healthy, un-assessable) and the anti-pattern
table live in [references/examples.md](references/examples.md).

## Limitations

- **Static, not runtime.** Tiering reads paths and imports. It does not run the
  suite, so a test that behaves differently from how it reads is misfiled.
- **The ratio is over files unless test cases are counted.** One E2E file with
  thirty scenarios and one unit file with one assertion weigh the same in a
  file-count ratio. Count cases when the runner exposes them, and say which you
  used.
- **The flake window bounds the resolution.** Every band in Step 3 is limited by
  how many runs you have. Do not report a 1% rate from a 50-run window.
- **The defect proxy is weak.** Teams that squash commits, omit fix markers, or
  fix defects without touching a test will see an ROI axis that is `not assessed`
  or misleading. Prefer `not assessed` over a proxy you do not trust.
- **One repository per run.** A monorepo's test directories can be walked
  together, but a separate test-only repository is a separate audit: merging them
  averages away the signal that would drive any decision.
- **No effort estimate.** Findings are ranked by blast radius. What each fix
  costs depends on team familiarity with the code and is outside this scope.

## References

Each source is quoted inline at the claim it grounds; this is the index only.

- [Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) - tier scope definitions, relative speed and maintenance cost per layer, the ice-cream-cone warning, and the pyramid proportions as an adaptable heuristic.
- [Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html) - the "many more low-level UnitTests than high level BroadStackTests" premise and why UI-driven tests are brittle, expensive, and slow.
- [Fowler, Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) - the definition of a non-deterministic test, why a disregarded regression test loses its value, and quarantine as a capped holding action.
- [Dodds, Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) - the confidence-rises-up-the-pyramid counterpoint and integration's balance of confidence against speed and expense.
