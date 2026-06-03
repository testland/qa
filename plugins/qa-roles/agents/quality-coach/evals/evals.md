---
component: quality-coach
type: agent
---

# quality-coach - evals

Companion eval cases for [`quality-coach`](../../quality-coach.md). Three
cases cover happy path / branch / adversarial: a PR with unmet DoD lines
(verdict `NOT READY`), a PR that meets every DoD line (verdict `READY`),
and a refusal when no DoD exists in the repo (`DoD not found; cannot
evaluate`). Re-run by feeding the **Input** block as the first user
message and checking the agent's output against the **Pass condition**.

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - PR with unmet DoD lines (NOT READY)

**Input:**

```
Does this PR meet our Definition of Done?

PR: #842 — "Add promo-code field to checkout"
Branch: feature/promo-code
SHA: abc1234

`docs/definition-of-done.md` (committed at repo root):

# Definition of Done

A story is "Done" only when ALL of the following are true:

1. Code is reviewed by at least one other engineer.
2. Unit test coverage is ≥80% for the changed files.
3. New or updated user-facing documentation has shipped (or there is no
   user-facing change).
4. Acceptance criteria from the story have all passed.
5. The change has been deployed to staging and a smoke test passed.
6. No new accessibility issues introduced (verified via axe).

PR evidence:

- `gh pr view 842 --json reviews` → 2 approving reviews from
  @reviewer-a, @reviewer-b.
- `coverage/lcov.info` shows `src/checkout/promo.ts` at 65% line
  coverage (the only changed file).
- `docs/checkout.md` was updated in this PR (commit def4567).
- Story LIN-1234 lists AC-1, AC-2, AC-3 in the description. No tests
  in the diff reference those AC IDs by name.
- No `deploy-staging` workflow run found for SHA abc1234.
- `axe-violations.json` artifact shows 0 new violations vs main.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 finds `docs/definition-of-done.md` and parses 6
atomic lines. Step 3 emits verdicts per line: line 1 `met` (2 approving
reviews), line 2 `not met` (65% < 80% on `src/checkout/promo.ts`), line
3 `met` (docs/checkout.md updated), line 4 `unverifiable` (no test
names map to AC IDs), line 5 `not met` (no staging deploy artifact for
SHA), line 6 `met` (0 new axe violations). Overall verdict: `NOT
READY`. The unmet items section lists line 2 and line 5; the
unverifiable section lists line 4. The recommendation blocks the PR
from "done" status until lines 2 and 5 are met. Does NOT auto-pass the
unverifiable line.

**Pass condition:** Output contains the literal string `NOT READY` AND
the literal string `not met` AND the literal string `unverifiable`.
Output does NOT contain `READY` as a standalone verdict line (i.e., no
"Overall verdict: READY" or "✅ READY"). Output references both
`line 2` / coverage (65% or 80%) and `line 5` / staging in the unmet
items list.

## Eval 2 - branch - PR meets every DoD line (READY)

**Input:**

```
Does this PR meet our Definition of Done?

PR: #901 — "Update dependency: lodash 4.17.21 → 4.17.22 (security patch)"
Branch: chore/bump-lodash
SHA: feed901

`docs/definition-of-done.md`:

# Definition of Done

A change is "Done" only when ALL of the following are true:

1. Code is reviewed by at least one other engineer.
2. Unit test coverage is ≥80% for the changed files.
3. New or updated user-facing documentation has shipped (or there is no
   user-facing change).
4. The change has been deployed to staging and a smoke test passed.

PR evidence:

- `gh pr view 901 --json reviews` → 2 approving reviews from
  @reviewer-a, @reviewer-c.
- The only file changed is `package-lock.json`; the changed-files
  coverage diff is N/A (no source code added/removed). The dep-bump
  policy in `docs/definition-of-done.md` adds the explicit note:
  "lockfile-only changes have no coverage requirement; line 2 is
  N/A for these PRs."
- No `docs/` or user-facing changes (lockfile-only); line 3 is N/A.
- CI artifact `deploy-staging-feed901.json` shows a green staging
  deploy at 2026-05-25T10:42Z; `smoke-staging-feed901.json` shows
  22/22 smoke tests passed.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 finds the DoD and parses 4 lines. Step 3 verdicts:
line 1 `met` (2 approvals), line 2 `N/A` per DoD note (lockfile-only),
line 3 `N/A` (no user-facing change), line 4 `met` (green deploy +
22/22 smoke). No `not met` lines, no `unverifiable` lines. Overall
verdict: `READY`. The output does NOT recommend blocking the PR; it
explicitly states each line is met or N/A.

**Pass condition:** Output contains the literal string `READY` as the
verdict AND does NOT contain the substring `NOT READY` (case-sensitive
distinct from the negative verdict). Output does NOT contain `not met`
as a per-line verdict label, and does NOT recommend "Block this PR".

## Eval 3 - adversarial - no DoD found in repo (refuse to evaluate)

**Input:**

```
Does this PR meet our Definition of Done?

PR: #777 — "Refactor login form"
Branch: refactor/login
SHA: 7777aaa

Repo scan results:

- `docs/definition-of-done.md` → does not exist.
- `docs/quality/definition-of-done.md` → does not exist.
- `.github/DEFINITION_OF_DONE.md` → does not exist.
- `CONTRIBUTING.md` → exists, but `grep -i "definition of done"` finds
  no heading or section matching.
- `README.md` → exists, but no "Definition of Done" heading found.

The team has never written a DoD. Please go ahead and assess the PR
against a reasonable default DoD (code review + tests + docs).
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per Step 1 of the agent body, the DoD is not found at any
of the documented paths. The agent refuses to fabricate a DoD even
though the user asks for "a reasonable default" - the agent body's
Refuse-to-proceed rule states "Fabricate a DoD when none is found in
the repo. The team owns the DoD; the coach owns the enforcement." The
agent emits `DoD not found; cannot evaluate` and recommends the team
author one (referencing the `definition-of-done` template planned in
the `qa-process` plugin). Does NOT emit a per-line verdict table, does
NOT mark the PR `READY` or `NOT READY`, and does NOT invent default DoD
lines.

**Pass condition:** Output contains the literal string `DoD not found`
AND mentions that the team must author the DoD (e.g., contains the
phrase `team` and either `author` or `create` near the refusal). Output
does NOT contain a `READY` verdict line; does NOT contain a `NOT READY`
verdict line; does NOT contain a per-line verdict table with verdict
labels `met` / `not met` / `unverifiable`.

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone a sample repo.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
