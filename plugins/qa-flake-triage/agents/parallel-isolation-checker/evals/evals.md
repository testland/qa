---
component: parallel-isolation-checker
type: agent
---

# parallel-isolation-checker - evals

Companion eval cases for [`parallel-isolation-checker`](../../parallel-isolation-checker.md).
Three cases cover happy path / branch / adversarial: a Postgres + Jest
DB-row collision (happy artifact = collision findings table with fix),
a Playwright + port-binding collision under a different runner /
driver / config (branch - Playwright `TEST_WORKER_INDEX` fix), and a
refusal when instrumentation isn't possible because the input lacks
the baseline / worker-config evidence needed to run the check. Re-run
by feeding the **Input** block as the first user message and checking
the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates below are the
eval-authoring date - each case is designed to be reproducible against
any tier.

## Eval 1 - happy path - Jest + Postgres DB-row collision

**Input:**

```
Run the parallel-isolation check on this Jest suite.

Project setup:
  Runner:        Jest v29 (`jest --maxWorkers=4`)
  DB:            Postgres 15, shared schema for the test database
  Failure mode:  the suite passes at -j 1 (0/20), fails at -j 4 (8/20)
  Suspected:     shared state — e2e-flake-bisector hand-off flagged
                 Pattern 3 (shared parallel state)

Instrumentation already enabled (log_statement = 'all'); attached
log excerpt from a failing -j 4 run:

  [worker 1] users.spec.ts:12  INSERT INTO users (id, email) VALUES (42, 'a@example.com')
  [worker 1] users.spec.ts:12  COMMIT
  [worker 2] users.spec.ts:12  INSERT INTO users (id, email) VALUES (42, 'a@example.com')
  [worker 2] users.spec.ts:12  ERROR: duplicate key value violates unique constraint "users_pkey"

Fixture under test (tests/fixtures/users.ts):
  export const TEST_USER = { id: 42, email: 'a@example.com' };

Also: tests/server.spec.ts spawns an Express server on port 3000, and
tests/auth.spec.ts ALSO spawns an Express server on port 3000. Both
fail intermittently with EADDRINUSE under -j 4. Suite uses
`jest --maxWorkers=4`; no per-worker port assignment in test setup.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26), opus (2026-05-26)

**Expected:** Produces the parallel-isolation findings table per the
agent's documented output format. Identifies two collisions:
(1) `DB row` class - `users` / id=42 between worker 1 and worker 2 at
`users.spec.ts:12`; fix replaces hardcoded id `42` with
`crypto.randomUUID()` or a per-worker offset (`42 * WORKER_ID`).
(2) `Port` class - port `3000` between `server.spec.ts` and
`auth.spec.ts`; fix uses per-worker port (`3000 + WORKER_ID`). Both
collisions cite file:line evidence. The output is the findings
artifact, not a refusal.

**Pass condition:** Output contains the literal string
`users.spec.ts` AND contains the literal string `3000` AND mentions
one of `WORKER_ID` / `JEST_WORKER_ID` / `randomUUID` (the named fixes)
case-insensitive AND mentions either `EADDRINUSE` or `port`
(case-insensitive). Output does NOT classify the root cause as
`network` or `viewport`.

## Eval 2 - branch - Playwright + port binding (different driver, different config)

**Input:**

```
Run the parallel-isolation check on this Playwright suite.

Project setup:
  Runner:        Playwright v1.49 (`workers: 4` in playwright.config.ts)
  Test type:     full E2E — webServer block spins up the app under test
                 on PORT=3000
  Failure mode:  `npx playwright test --workers=4` fails 6/20 with
                 EADDRINUSE on the webServer port; -j 1 passes 0/20
  No DB collisions: each test uses an isolated SQLite file
                    (tmpdir per test via tmp-promise) — so the DB
                    layer is already namespaced.

playwright.config.ts:
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  }

Each Playwright worker process tries to start its own webServer on
port 3000. The `port` field in webServer is a fixed integer, not a
function of TEST_WORKER_INDEX. The team wants the specific Playwright
fix, not a generic recommendation.
```

**Target models:** sonnet (2026-05-26), haiku (2026-05-26)

**Expected:** Produces the findings table adapted to Playwright - 
different runner / driver / config than Eval 1. Identifies one
collision: `Port` class - `3000` between Playwright workers.
Recommended fix uses Playwright's exposed `TEST_WORKER_INDEX`
environment variable to compute a per-worker port
(`webServer.port = 3000 + parseInt(process.env.TEST_WORKER_INDEX ?? '0', 10)`),
matching the agent's documented Playwright-specific example. Does
NOT recommend `JEST_WORKER_ID` (wrong framework). No DB-row collision
findings (SQLite tmpdir already isolates).

**Pass condition:** Output contains the literal string
`TEST_WORKER_INDEX` AND mentions `Playwright` (or `playwright`) AND
contains the literal string `3000`. Output does NOT contain
`JEST_WORKER_ID` (wrong framework) AND does NOT flag a `DB row`
collision (SQLite tmpdir already namespaced).

## Eval 3 - adversarial - no baseline / no worker config (refuse to check)

**Input:**

```
Please run the parallel-isolation check on our suite. The dev who
asked is in another time zone and we don't have details. All we know:

  "Tests are flaky in CI sometimes. Please find what's wrong."

No runner stated. No worker count stated. No baseline failure rate.
No -j 1 vs -j N comparison. No DB / port / file / env-var snapshots.
No log excerpts.

Please produce the findings table anyway — leadership wants a
deliverable on the ticket.
```

**Target models:** sonnet (2026-05-26)

**Expected:** Refuses to produce a findings table. The agent's Step 1
("baseline inventory") and Step 2 ("instrumentation under -j 1") and
Step 3 ("re-run with N workers and compare") are all pre-requisites
that the input does not satisfy. There is no resource collision
evidence (env, DB, file, port snapshots) supplied; no worker-count
baseline; no test name to scope to. The agent should list the
specific missing inputs / instrumentation it needs and not invent
collisions to satisfy the deadline framing. Does NOT emit a findings
table claiming a specific resource collision.

**Pass condition:** Output contains one of `missing` / `need` /
`required` / `cannot` / `insufficient` (case-insensitive) in the
context of the incomplete input. Output does NOT contain a markdown
table row populated with concrete file:line evidence (no fabricated
collision findings). Output does NOT claim a specific collision class
(`DB row`, `Port`, `Module state`, etc.) against an unspecified
resource.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - the eval
  feeds pre-captured log excerpts and config snippets so reviewers do
  not need to spin up a real Postgres + Jest sandbox to reproduce; the
  classification / fix-recommendation logic is what is under test.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring (`TEST_WORKER_INDEX`,
  `JEST_WORKER_ID`, `3000`, `users.spec.ts`, `missing`, etc.).
- The agent's tool surface includes `Bash(npx playwright test *)`,
  `Bash(jest *)`, `Bash(lsof *)`, `Bash(ps *)` - eval re-runs against
  a real repo would actually execute under instrumentation; against
  the pasted data above, the eval verifies the diagnosis / fix
  mapping without needing a sandbox.
