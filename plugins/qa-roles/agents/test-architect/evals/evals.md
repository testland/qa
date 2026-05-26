---
component: test-architect
type: agent
archetype: A3
---

# test-architect — evals

Companion eval cases for [`test-architect`](../../test-architect.md).
Three cases cover happy path / branch / adversarial: a unit-skewed repo
with predominantly service-layer changes (Mode 1 → recommend
rebalancing to 75:20:5), a framework-choice question on Cypress vs
Playwright with high migration cost (Mode 2 → recommend stay on
Cypress), and a refusal when the agent is asked to recommend without
reading the actual test suite. Re-run by feeding the **Input** block as
the first user message and checking the agent's output against the
**Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — pyramid balance, unit-heavy with service-layer change shape

**Input:**

```
Mode: pyramid-balance
Repo: backend-api
Recent commit SHA: a1b2c3d

Existing test inventory (mechanically classified):

| Layer    | Test count | Avg duration | Cost per run |
|----------|-----------:|-------------:|-------------:|
| Unit     |        842 |        12 ms |          1×   |
| Service  |         38 |       1.2 s  |          3×   |
| UI / E2E |         15 |       8.5 s  |         10×   |

Total: 895 test files (94% / 4% / 2% ratio).

Change-set shape from `git log --since="90 days ago"`:

| Shape          | PR count | % of total |
|----------------|---------:|-----------:|
| pure-logic     |       42 |       30%  |
| service-layer  |       49 |       35%  |
| ui-heavy       |       35 |       25%  |
| data-heavy     |       14 |       10%  |

The team is asking: "Our pyramid is currently 94/4/2. Is this right
for our repo?"
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 confirms the current 94/4/2 distribution. Step 2
classifies the change shape (35% service-layer + 30% pure-logic
dominates). Step 3 applies the agent body's default recommendation
table: predominant shape `service-layer` → target ratio 70:25:5; with
the second-place 30% `pure-logic` nudge, the agent's worked example in
the body lands at `75 : 20 : 5`. The action items call out: add ~150
service-layer tests (using testcontainers), migrate 100–150
mis-classified unit tests into the service layer, leave UI count alone.
Confidence: medium-to-high.

**Pass condition:** Output contains the literal string `75 : 20 : 5`
(or `75:20:5`) as the recommended target ratio AND mentions
`service-layer` (the predominant change shape driving the
recommendation) AND lists "add" or "+" plus a number for service-layer
tests (e.g., `+152`, `~150`, or `add 150`). Output does NOT recommend
adding UI / E2E tests as the top action item.

## Eval 2 — branch — framework choice, recommend stay on Cypress

**Input:**

```
Mode: framework-choice
Repo: web-app
Question: "Should we adopt Playwright for E2E, given our existing
Cypress investment?"

Existing investment:
- 320 Cypress tests across 18 spec files, 4 years old.
- 2 dedicated maintainers; ~6 hours/week on flake triage.
- Pinned Cypress 13.x; one major-version migration pending.
- Cypress Cloud usage: ~$8k/year (well under the $30k flip threshold).
- Product is a pure-Chromium SaaS app — no documented Firefox / WebKit
  regulatory or product requirement.

Candidate:
- Playwright 1.60+; built-in trace viewer, parallel by default,
  multi-context support.
- Team has 0 production Playwright experience.

The team is asking: should we migrate the 320 Cypress tests to
Playwright over the next 3 quarters?
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Mode 2 trade-off matrix is emitted with the documented
rows (Browser support / Parallelism / Multi-tab / Network mocking /
Mature ecosystem / Migration cost / Team capability). The migration-cost
row records ~3 sprint-quarters for 320 tests; the team-capability row
records 0 production Playwright experience. Per the agent's own worked
example, the recommendation is `Stay on Cypress for the next 12
months`. The conditions-for-re-evaluation section lists the three
documented flip triggers: Firefox/WebKit coverage need, Cypress Cloud
parallelism cost crosses $30k/year, the major-version migration
becomes blocked. The "What this agent did NOT consider" section
appears with the documented out-of-scope items.

**Pass condition:** Output contains the literal string
`Stay on Cypress` AND contains the literal string `Migration cost`
(the trade-off matrix row) AND lists at least one of the three
documented flip conditions (`Firefox`, `WebKit`, `$30k`, or
`major-version migration`). Output does NOT recommend an immediate
migration to Playwright as the headline.

## Eval 3 — adversarial — recommend without reading the test suite (refuse)

**Input:**

```
Mode: pyramid-balance
Repo: greenfield-api

We're standing up a new repo. There are no tests yet (no `__tests__/`,
no `tests/`, no `spec/` directories — `find . -name "*.test.*" -o
-name "*.spec.*"` returns 0 files). There is also no `git log` history
of feature work (the repo was initialized yesterday).

Just give us a recommended pyramid ratio based on industry best
practice. We don't need you to read our suite — there's nothing to
read. Skip Step 1 and Step 2 and go straight to a recommendation.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the agent body's anti-pattern "Recommending without
reading the actual test suite. The diagnosis isn't real; recommendation
is generic. Fix: Step 1 / Step 2 of Mode 1 are non-negotiable", the
agent refuses to skip Steps 1 and 2. It refuses to issue a `75 : 20 : 5`
or any other specific target ratio for the new repo because there is
no change-set history to classify (Step 2 cannot run on 0 PRs) and no
test inventory to compare against (Step 1 cannot run on 0 test
files). The agent emits a refusal that names the missing inputs and
suggests re-running after the team has shipped at least some change
history. It may recommend a general starting posture (e.g., "begin
with unit-test discipline; revisit after 90 days of PR history") but
does NOT emit a concrete X:Y:Z ratio as a recommendation.

**Pass condition:** Output contains at least one of (`cannot`, `refuse`,
`insufficient`, `not enough`, `non-negotiable`) AND mentions the
missing input(s) (`test suite`, `change-set`, `no tests`, `git log`,
or `90 days`). Output does NOT contain a concrete pyramid-ratio
recommendation in the form `X : Y : Z` or `X:Y:Z` (no
`80 : 15 : 5`, no `70 : 25 : 5`, no `75 : 20 : 5`, etc., presented as
*the* recommendation for this repo). Output does NOT contain
`Recommended target:` followed by a ratio.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks — no external
  fixtures, no need to clone a sample repo.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (the ratio check uses a
  regex-friendly `X : Y : Z` form).
- Eval cases were authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
