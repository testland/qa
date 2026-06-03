---
component: definition-of-done-checker
type: agent
---

# definition-of-done-checker - evals

Companion eval cases for [`definition-of-done-checker`](../../definition-of-done-checker.md).
Three cases cover happy path / branch / adversarial: a PR that fails
multiple DoD items (verdict `REJECT`), a story that passes
ready-for-dev (verdict `ACCEPT`), and an audit with no DoD source
found (verdict `INCONCLUSIVE` - refuse to opine). Re-run by feeding
the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

## Eval 1 - happy path - PR fails on test-coverage and a11y items (REJECT)

**Input:**

```
Run the Definition-of-Done check against PR #4567.

DoD source (from docs/definition-of-done.md):

# Definition of Done — Stage 2 (PR-level)

- [ ] All AC scenarios have tests; tests pass.
- [ ] No new linter / type-check errors.
- [ ] Security scan (npm audit / Snyk) passes.
- [ ] Accessibility scan (axe-core) passes for any UI-touching change.
- [ ] Documentation updated (changelog / README).
- [ ] Reviewer-approval count met (1+ non-author).

PR #4567 artifacts:

- Title: "Add discount code field to checkout summary"
- Files changed:
    src/components/CheckoutSummary.tsx       (+42 / -8)
    src/components/CheckoutSummary.test.tsx  (+18 / -0)
    src/styles/checkout.css                  (+12 / -2)
- Linked story: LIN-2231 (3 acceptance criteria: AC-1, AC-2, AC-3).
- CheckoutSummary.test.tsx adds one new test:
    describe('CheckoutSummary > AC-2', () => { ... })
  No tests reference AC-1 or AC-3.
- CI run #8812: type-check green, lint green, jest green,
  npm audit green.
- No axe-core job in CI workflow.
- CHANGELOG.md unchanged in this PR.
- Reviewers: 1 approval (Alice — non-author).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per the "When invoked" Step 4 ("Reject if any item is
unmet. Default disposition is REJECT; the agent only ACCEPTS when
every item has positive evidence"), the agent emits verdict
`REJECT`. Failing items: (a) "All AC scenarios have tests" - 
AC-1 and AC-3 lack tests; (b) "Accessibility scan passes for UI
changes" - no axe-core artifact in CI; (c) "Documentation updated" - no CHANGELOG.md diff for a user-visible feature. Passing items
include the linter/type-check, security scan, and reviewer-approval
DoD items. Output follows the format in the "Output format" section
with `**Stage:** ready-for-merge`.

**Pass condition:** Output contains the literal string `REJECT`
AND mentions at least two of `AC-1`, `AC-3`, `axe`, or `CHANGELOG`
(the specific missing-evidence rationale). Output does NOT contain
a final `ACCEPT` verdict line.

## Eval 2 - branch - story passes ready-for-dev (ACCEPT)

**Input:**

```
Run the Definition-of-Done check against Linear story LIN-1234.

DoD source (from docs/definition-of-done.md):

# Definition of Done — Stage 1 (story-level, ready-for-dev)

- [ ] Story title is one sentence; describes user value.
- [ ] Acceptance criteria present (Gherkin or list form).
- [ ] Testability passes (no untestable claims).
- [ ] NFRs identified for the story's scope (if applicable).
- [ ] Effort estimated (story points or t-shirt size).
- [ ] Dependencies identified.

Story LIN-1234 fields:

- Title: "User can save a default shipping address from the checkout
  summary."
- Description excerpt:
    Acceptance criteria:
      AC-1: Given a logged-in user on /checkout, when they click
            "Save as default", then the address is persisted to
            /api/user/default-address (POST) and a green confirmation
            toast appears.
      AC-2: Given a logged-in user with a saved default address,
            when they return to /checkout, then the form is
            pre-filled with that address.
      AC-3: Given a guest user (not logged in), when they view
            /checkout, then the "Save as default" button is hidden.
- NFRs: "p95 latency on POST /api/user/default-address ≤200ms under
  50 RPS" (from linked NFR spec).
- Effort: 5 story points.
- Dependencies: requires user-profile API v2 (already shipped).
- Testability review by testability-reviewer: OK (all 3 AC pass
  Observable + Decidable + Bounded).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** All six Stage 1 DoD items have positive evidence:
title is one sentence and describes user value; AC are present in
Given/When/Then form; testability is OK; NFRs are identified;
effort is 5 points; dependencies are named (user-profile API v2).
Per "When invoked" Step 4, the agent emits `ACCEPT`. Output may
include optional context notes (per Example 2 in the agent body)
but no `Failing items` table rows. `**Stage:** ready-for-dev`.

**Pass condition:** Output contains the literal string `ACCEPT`
AND at least one of `ready-for-dev` or `Items unmet:** 0`. Output
does NOT contain a `REJECT` verdict line, AND does NOT contain an
`INCONCLUSIVE` verdict line.

## Eval 3 - adversarial - no DoD source found (INCONCLUSIVE)

**Input:**

```
Run the Definition-of-Done check against PR #9999.

No inline DoD provided.

Repository contents (relevant paths only):
  README.md
  src/...
  tests/...
  package.json
  .github/workflows/ci.yml

There is NO docs/definition-of-done.md file in the repo.
There is NO .github/DEFINITION_OF_DONE.md file in the repo.
CONTRIBUTING.md does not exist either.

PR #9999 description: "Refactor checkout state machine."
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per "When invoked" Step 1 ("Locate the DoD source. In
order: Inline DoD ... docs/definition-of-done.md ...
.github/DEFINITION_OF_DONE.md ... Project wiki link in
CONTRIBUTING.md"), all four sources are absent. Per Example 3 in
the agent body, the agent emits `INCONCLUSIVE (no DoD source)`,
enumerates the search paths it tried, and refuses to emit either
`ACCEPT` or `REJECT` because neither verdict is well-formed without
a DoD to check against. Recommended action: the team must author and
commit a DoD per the Scrum Guide before this agent can run again.

**Pass condition:** Output contains the literal string `INCONCLUSIVE`
AND at least one of `docs/definition-of-done.md` or `no DoD source`
(the named search path or the explicit refuse phrase). Output does
NOT contain a final `ACCEPT` verdict line, AND does NOT contain a
final `REJECT` verdict line.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks describing a
  DoD source plus an artifact under review - no external Linear /
  GitHub API access needed.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7 sub-checks
  (Evals exist, Multi-model coverage, Acceptance criteria, Adversarial
  coverage, Reproducibility).
