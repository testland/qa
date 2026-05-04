---
name: flake-pattern-reference
description: Reference catalog of flake patterns — async/timing, test ordering, shared parallel state, resource leaks, network, locator drift, environment variance, randomness — with detection heuristics and remediation per pattern. Use when triaging an unknown flake to identify the category before bisecting.
rating: 24
d6: 3
archetype: S2
---

# flake-pattern-reference

> **Terminology note:** "flaky test" is a practitioner-emergent term
> popularized by the Google Testing Blog ([google-causes][gtb-causes],
> [google-flaky][gtb-flaky]); ISTQB does not maintain a canonical
> entry. This catalog reflects industry-engineering consensus, not
> ISTQB authority.

[gtb-flaky]: https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
[gtb-causes]: https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html

A flake is rarely random — it almost always falls into one of eight
recurring patterns. Identifying the pattern early shrinks the bisect
search space dramatically. This catalog is a reference, not a
workflow; the matching workflow is in
[`flaky-test-quarantine`](../flaky-test-quarantine/SKILL.md), and the
agent that drives a structured bisect is
[`e2e-flake-bisector`](../../agents/e2e-flake-bisector.md).

The Google Testing Blog observed a near-linear correlation between
test size and flakiness rate across ~4.2M tests
([google-causes][gtb-causes]) — larger tests touch more of the eight
patterns at once.

## Pattern 1: async / timing

The most common flake category in UI and integration tests.

| Signal                                                         | What's happening                                              |
|----------------------------------------------------------------|---------------------------------------------------------------|
| Fails ~5–20% of runs; passes when the machine is faster        | Test waits for an arbitrary `setTimeout(N)` instead of a deterministic event. |
| Fails on CI but never locally                                  | CI runners have different cold-start timings than dev laptops. |
| Fails after a dependency upgrade with no test code change       | Library's internal timing changed (e.g. Playwright auto-wait window). |

**Remediation:**

- Replace fixed sleeps with **deterministic waits** — `await
  expect(loc).toBeVisible()`, `page.waitForLoadState('networkidle')`,
  `page.waitForFunction(...)`, etc.
- For animations, **disable** them in test setup
  (`animations: 'disabled'` in Playwright; `Cypress.config('animationDistanceThreshold', 0)` in Cypress).
- For absolute clock dependencies, **freeze time** with
  `sinon.useFakeTimers()` / `vi.useFakeTimers()` / Playwright's
  `page.clock.install()`.

## Pattern 2: test ordering

Tests pass alone, fail when run with siblings.

| Signal                                                       | What's happening                                          |
|--------------------------------------------------------------|-----------------------------------------------------------|
| `npm test -- --testNamePattern='^X$'` passes; full run fails  | Test relies on state from a previously-run test.          |
| Adding a new test breaks an unrelated existing one            | Implicit ordering dependency exposed by the new test pushing the old test into a different position. |
| Random-order test runners (Jest `randomize`) flag the suite   | Suite is order-dependent.                                 |

**Remediation:**

- Run the suite with **explicit randomization** in CI to surface
  ordering deps early (`jest --randomize`, `pytest --random-order`,
  `mocha --sort` reverse).
- Move ANY shared setup into `beforeEach` / `afterEach`, never rely on
  `beforeAll` for state that the test mutates.
- Database tests: roll back transactions after each test instead of
  truncating between describe blocks.

## Pattern 3: shared parallel state

Tests pass sequentially, fail when run in parallel workers.

| Signal                                                          | What's happening                                           |
|-----------------------------------------------------------------|------------------------------------------------------------|
| Fails ~50% of runs in CI matrix; passes locally with `-j 1`     | Two workers writing to the same DB row / file / port.     |
| Fails more often as worker count goes up                         | Linear shared-state contention.                            |
| Error message mentions "duplicate key" / "address in use" / "file already exists" | Direct collision evidence.                                  |

**Remediation:**

- Use the [`parallel-isolation-checker`](../../agents/parallel-isolation-checker.md)
  agent to find shared state.
- Per-worker isolation: per-worker DB schemas (`PG_SCHEMA=test_${WORKER}`),
  per-worker temp dirs (`TMPDIR=/tmp/test-${WORKER}`), per-worker port
  ranges.
- For unique IDs: use UUIDs or a per-worker namespace prefix, not
  auto-increment integers shared across workers.

## Pattern 4: resource leaks

Tests pass on a fresh machine, fail after the test process has run for
hours.

| Signal                                                         | What's happening                                            |
|----------------------------------------------------------------|-------------------------------------------------------------|
| Fails increasingly often as suite duration grows                | Memory or file-descriptor leak in the test setup.          |
| `EMFILE` / `EADDRINUSE` errors mid-suite                         | File-descriptor or port exhaustion.                         |
| Long-running processes (Playwright browsers, Cypress runners) crash mid-suite | Process accumulating zombies. |

**Remediation:**

- Always `await browser.close()` / `await server.close()` in `afterAll`,
  with a `try/finally` so failed tests still clean up.
- Set per-test timeouts and ensure the framework kills the process,
  not just the test (`--testTimeout`, `test.setTimeout()`).
- Run `lsof | wc -l` and `ps aux | wc -l` before / after the suite in
  CI to detect leaks; alert when growth exceeds a threshold.

## Pattern 5: network / external service

Tests pass when the upstream is healthy, fail otherwise.

| Signal                                                         | What's happening                                            |
|----------------------------------------------------------------|-------------------------------------------------------------|
| Fails on the same handful of tests that hit the same external URL | Real network call to a flaky third party.                |
| Fails right after a deploy of a non-test service               | Test is hitting prod / staging of a sibling service.        |
| `ETIMEDOUT` / `ECONNRESET` in error logs                         | Network-layer error, not test-logic error.                  |

**Remediation:**

- **Mock at the boundary** — never let test code reach a real network
  endpoint. Use Mock Service Worker (MSW), nock, WireMock, or
  Playwright's `page.route()`.
- For tests that *must* hit a real service (smoke / contract tests),
  isolate them in a separate suite that doesn't gate the main CI.
- DNS-level: pin to specific resolvers in CI to avoid resolver
  variance.

## Pattern 6: locator drift

UI tests pass when the page looks one way, fail when it shifts.

| Signal                                                         | What's happening                                            |
|----------------------------------------------------------------|-------------------------------------------------------------|
| Fails after an unrelated CSS change                             | Selector matched by position rather than identity.          |
| `selector matched 2 elements` errors                            | Ambiguous selector now matches more than one node.          |
| Fails only at certain viewports                                 | Layout shifts cause mobile / desktop selectors to differ.   |

**Remediation:**

- Use **role-based selectors** first (`page.getByRole('button', { name: 'Submit' })`),
  then `data-testid`, only `text=` / CSS as a last resort.
- For Playwright: enable `strict: true` so any ambiguous selector
  fails immediately rather than silently picking the first match.
- For viewport-specific UIs: snapshot at every breakpoint via
  [`responsive-breakpoint-runner`](../../../qa-visual-regression/skills/responsive-breakpoint-runner/SKILL.md);
  visual signal exposes layout-shift flakes faster than text checks.

## Pattern 7: environment variance

Tests pass on Linux CI, fail on macOS dev machines (or vice versa).

| Signal                                                         | What's happening                                            |
|----------------------------------------------------------------|-------------------------------------------------------------|
| Fails only on a specific CI runner / OS                         | OS-specific path separator, line ending, or filesystem case sensitivity. |
| Snapshot tests fail with sub-pixel diffs across OS              | OS font / anti-aliasing differences (see [`playwright-snapshots`](../../../qa-visual-regression/skills/playwright-snapshots/SKILL.md)). |
| Fails in `tz` configurations not set to `UTC`                   | Timezone-sensitive assertion.                               |

**Remediation:**

- Pin CI to one OS / one timezone (`TZ=UTC`) for deterministic runs.
- Run snapshot updates only in CI, never from a developer laptop
  (per [`playwright-snapshots`](../../../qa-visual-regression/skills/playwright-snapshots/SKILL.md)).
- For path-sensitive code, normalize with `path.posix.join()` /
  `node:path`.

## Pattern 8: randomness

Tests use random data without a controlled seed.

| Signal                                                         | What's happening                                            |
|----------------------------------------------------------------|-------------------------------------------------------------|
| Failures don't reproduce on retry                               | Test data was randomized; the failing combination is gone.  |
| Test asserts a property that holds "almost always"              | Property-based test exposing a real edge case (this is good — fix the production bug). |
| Faker-generated data triggers a layout overflow                 | Random string longer than the assertion expected.           |

**Remediation:**

- Seed every random source: `Math.random` via `seedrandom`, faker via
  `faker.seed(N)`, property-based testing via `fc.assert(prop, { seed })`.
- For property-based failures, **don't** mark them as flake — copy the
  failing seed into a regression test ([`bug-repro-builder`](../../../qa-bug-repro/agents/bug-repro-builder.md)).
- Persist the seed used in each CI run as a build artifact so a flake
  can be replayed.

## Triage decision tree

```
Test fails ~50% of runs?
├── Yes → likely "shared parallel state" or "test ordering"
└── No → fails ~5–20% of runs?
    ├── Yes → likely "async/timing" or "network"
    └── No → fails only on specific OS / runner?
        ├── Yes → "environment variance"
        └── No → fails after long suite duration?
            ├── Yes → "resource leaks"
            └── No → fails after unrelated UI change?
                ├── Yes → "locator drift"
                └── No → does the test use random data?
                    ├── Yes → "randomness"
                    └── No → bisect with `e2e-flake-bisector`
```

For systematic bisection, hand the test off to the
[`e2e-flake-bisector`](../../agents/e2e-flake-bisector.md) agent,
which varies one axis at a time per the patterns above.

## References

- [google-flaky][gtb-flaky] — Google Testing Blog overview.
- [google-causes][gtb-causes] — Google's correlation analysis on
  ~4.2M tests; "test size correlates with flakiness rate."
- [`flaky-test-quarantine`](../flaky-test-quarantine/SKILL.md) —
  workflow that uses this catalog during triage.
- [`e2e-flake-bisector`](../../agents/e2e-flake-bisector.md),
  [`parallel-isolation-checker`](../../agents/parallel-isolation-checker.md),
  [`regression-bisector`](../../agents/regression-bisector.md) —
  agents that implement the per-pattern detection.
