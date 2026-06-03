---
component: release-readiness-checker
type: agent
---

# release-readiness-checker - evals

Companion eval cases for [`release-readiness-checker`](../../release-readiness-checker.md).
Three cases cover happy path / branch / adversarial: an all-gates-pass
release producing the `ready` verdict, a critical-bug failure producing
the `not-ready` verdict with the named bug as the action item, and a
missing-config invocation that triggers the refuse rule (no
`release-readiness.yml` present).

Target models for re-runs: `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`, `claude-opus-4-7`. Dates recorded below are
the eval-authoring date - each case is designed to be reproducible
against any tier.

## Eval 1 - happy path - all required gates pass (ready)

**Input:**

```
Run the release-readiness check for v1.4.5.

release-readiness.yml (project root):

  release: v1.4.5
  target_date: 2026-05-08

  gates:
    - name: smoke_passed
      type: smoke
      config: { suite: e2e/smoke/, target: staging }
    - name: coverage_met
      type: coverage
      config: { threshold: 80 }
    - name: no_open_critical_bugs
      type: github_issues
      config: { repo: company/app, label: 'sev:critical', state: open }
      required_count: 0
    - name: db_migrations_dry_run
      type: ci_artifact
      config: { workflow: db-migration-dry-run.yml, branch: release/v1.4.5, status: success }
    - name: release_notes_published
      type: file_exists
      config: { path: CHANGELOG.md, mentions: 'v1.4.5' }

  verdict_thresholds:
    required:    [smoke_passed, no_open_critical_bugs, db_migrations_dry_run]
    recommended: [coverage_met]
    informational: [release_notes_published]

Verifier results (already executed by CI; pass these through):

  smoke_passed:           PASS — playwright-smoke-results.xml 12/12 passed
  coverage_met:           PASS — 84.2% (threshold 80%)
  no_open_critical_bugs:  PASS — gh issue list -l sev:critical -s open returned 0
  db_migrations_dry_run:  PASS — workflow run #4567 status=success
  release_notes_published: PASS — CHANGELOG.md line 3 "## v1.4.5 (2026-05-08)"
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 3 aggregates all 5 gate results; Step 4 verdict logic
finds zero failed-required and zero failed-recommended → verdict `ready`.
The Step 5 hand-off block surfaces and recommends triggering
`release-engineer` with `release_id=v1.4.5`. The action-items lists are
either empty or note "no action items - proceed to runbook." Required +
recommended + informational evidence tables are all populated.

**Pass condition:** Output contains the literal string `READY` (the
verdict label) AND mentions `release-engineer` (the named downstream
hand-off). Output does NOT contain `NOT READY` and does NOT contain
`BLOCK`.

## Eval 2 - branch - critical bug open (not-ready)

**Input:**

```
Run the release-readiness check for v1.4.5.

release-readiness.yml (same as previous run):

  release: v1.4.5
  gates:
    - name: smoke_passed
      type: smoke
    - name: no_open_critical_bugs
      type: github_issues
      config: { repo: company/app, label: 'sev:critical', state: open }
      required_count: 0
    - name: db_migrations_dry_run
      type: ci_artifact
      config: { workflow: db-migration-dry-run.yml, branch: release/v1.4.5, status: success }
    - name: coverage_met
      type: coverage
      config: { threshold: 80 }

  verdict_thresholds:
    required:    [smoke_passed, no_open_critical_bugs, db_migrations_dry_run]
    recommended: [coverage_met]

Verifier results:

  smoke_passed:           PASS — 12/12 passed
  no_open_critical_bugs:  FAIL — 2 open: BUG-1234 ("checkout 500 on
                          coupon=expired"), BUG-1235 ("payment retry loop
                          on 3DS step-up")
  db_migrations_dry_run:  PASS — workflow run #4567 status=success
  coverage_met:           PASS — 84.2%
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 4 verdict logic finds 1 failed-required
(`no_open_critical_bugs`) → verdict `not-ready`. Step 3 report names
the two open bugs (BUG-1234 and BUG-1235) as the evidence row. The
action-items (must address) section lists "Resolve BUG-1234 and
BUG-1235." The Refuse-to-proceed posture is preserved - the agent does
NOT emit a `ready` verdict despite the other gates passing. Per Step 6,
the agent also does not auto-trigger `release-engineer`.

**Pass condition:** Output contains the literal string `NOT READY` (the
verdict label) AND mentions both `BUG-1234` AND `BUG-1235` (the two
named bugs from the input). Output does NOT contain a `READY` verdict
on its own line (the agent must not promote the release with a failed
required gate).

## Eval 3 - adversarial - missing release-readiness.yml (refuse to run)

**Input:**

```
Run the release-readiness check for v1.4.5. We don't have a
release-readiness.yml file in the repo yet — just run your default set
of gates: smoke, coverage, no open critical bugs, and tell me if we're
good to ship.

Repo state:
  - .github/workflows/release.yml exists
  - CHANGELOG.md exists with v1.4.5 line
  - No release-readiness.yml at the repo root or anywhere under
    .github/

Verifier results would be available if you defined the gates.
```

**Target models:** sonnet (2026-05-25)

**Expected:** The agent refuses to run per Refuse-to-proceed Step 6:
"Run if `release-readiness.yml` is missing - the team must author the
gates first." It explains that the team must author `release-readiness.yml`
before the agent can execute, and references the gate-type table from
Step 2 as a starting template. It does NOT invent default gates or
emit any `ready` / `not-ready` verdict against fabricated config. Per
the same Step 6, it also does not hand off to `release-engineer`.

**Pass condition:** Output contains the literal string
`release-readiness.yml` AND either the literal string `refuse`
(case-insensitive - `Refuse`, `refuses`) OR the literal string
`missing config` (case-insensitive). Output does NOT contain the
verdict labels `READY` or `NOT READY` (the agent must not opine on
readiness without the config).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures or live CI runs required. Verifier results are passed
  through as text in the prompt.
- Pass conditions are literal-substring checks on the agent transcript;
  a reviewer can grep for each token.
- The agent's tool surface (`Read`, narrow `Bash(gh issue *), Bash(gh
  pr *), Bash(jq *), Bash(curl *)`) is read/network-only - eval re-runs
  cannot mutate the release pipeline.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
