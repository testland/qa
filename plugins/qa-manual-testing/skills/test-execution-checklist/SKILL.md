---
name: test-execution-checklist
description: Converts a regression suite (or test plan) into an executable manual checklist for cases when automation isn't viable — a release-day smoke checklist, a post-incident verification list, or a periodic compliance check. Outputs a per-TC checkbox list with the minimal preconditions, the action, and a one-line "what to look for" — short enough to fit on one page per major flow. Use when the team needs a focused human-runnable list (not full step-tables), e.g., for production smoke after deploy or for the on-call rotation's quick verification.
rating: 22
d6: 3
archetype: S3
---

# test-execution-checklist

## Overview

A full step-table manual script (per
[`manual-test-script-author`](../manual-test-script-author/SKILL.md))
is overkill for some situations:

- A 5-minute production smoke after every deploy.
- An on-call's "is it broken?" first-pass verification.
- A periodic (weekly / monthly) compliance check.
- A bug-bash kickoff (give every participant the same checklist).

For these, a **focused checklist** wins: ~10-30 items, each one
line, each with a clear pass/fail. The whole list fits on one
screen / one printed page; the runner sweeps through it in 5-15
minutes.

This skill produces those checklists from the upstream regression
suite (or a test plan).

## When to use

- After a deploy, the team needs a fast "did anything obviously
  break" sweep.
- On-call rotations want a "is the system broken?" template they
  can run before paging others.
- A bug-bash needs the same checklist for every participant so
  coverage is consistent.
- A compliance review needs a periodic verification record.

If the use case is "test a feature thoroughly before release," use
[`manual-test-script-author`](../manual-test-script-author/SKILL.md)
instead — full step-table format with expected results per step.

## Step 1 — Pick scope

A checklist's value is its focus. Scope by one of:

| Scope                | Item count | Wall time | Use |
|----------------------|-----------:|----------:|-----|
| Critical-path smoke   |      ~10   |   ~5 min  | Per-deploy. |
| Primary-flow check    |      ~20   |  ~15 min  | On-call first-pass. |
| Full-feature sweep    |      ~30   |  ~30 min  | Bug-bash kickoff. |
| Compliance record     |      ~10   |  ~10 min  | Weekly / monthly. |

Wider scope = lower run frequency = less repeated value.

## Step 2 — Convert each test case to one-line form

Source TCs from
[`manual-test-script-author`](../manual-test-script-author/SKILL.md)
or the existing regression suite. Compress each to a single line
with three slots:

```
[ ] [feature]: [action] → [observable outcome]
```

Examples:

```markdown
[ ] **Login**: enter `qa-test-user@example.com` + valid pwd → dashboard loads in <3s.
[ ] **Cart**: add `BOOK-001` → cart count badge shows "1".
[ ] **Promo code**: apply `WELCOME10` → subtotal drops by 10%.
[ ] **Checkout**: click `Place order` → confirmation page within 5s.
[ ] **Email**: order confirmation arrives within 5 min.
```

If a step needs 3+ lines to express, split into multiple checklist
items OR move it back to the full step-table format — the
checklist isn't the right artifact for that step.

## Step 3 — Group by flow

A 30-item flat list is hard to scan. Group:

```markdown
## Production smoke — release `v1.4.5`

**Tester:** ___________________  **Date:** ___________________  **Time:** ___________________
**Environment:** prod | staging   **Build SHA:** ___________________

### Auth flow

- [ ] **Login** (existing user): `qa-test-user@example.com` + valid pwd → dashboard <3s
- [ ] **Logout**: click `Sign out` → redirect to `/login`
- [ ] **Password reset**: click `Forgot password` → email arrives within 5 min

### Cart + checkout flow

- [ ] **Add to cart**: SKU `BOOK-001` → cart count badge shows "1"
- [ ] **Cart page**: navigate to `/cart` → item visible with qty 1, $24.99
- [ ] **Promo code**: apply `WELCOME10` → subtotal drops to $22.49
- [ ] **Checkout**: complete checkout with Stripe test card 4242 → confirmation page

### Account flow

- [ ] **Profile update**: change email → save → reload → email persists
- [ ] **Order history**: view past orders → most recent test order present

### Sign-off

**Pass / fail / partial:**
**Defects raised:** (list IDs)
**Notes:**
```

The flow grouping doubles as a coverage check — empty groups mean
the smoke doesn't cover that flow.

## Step 4 — Time-box and document

A checklist that takes "as long as it takes" gets skipped. Set an
explicit budget per group:

```markdown
| Group               | Items | Budget |
|---------------------|------:|-------:|
| Auth flow            |    3  |  3 min |
| Cart + checkout flow |    4  |  6 min |
| Account flow         |    2  |  3 min |
| **Total**            |   9   | 12 min |
```

If the actual run exceeds the budget by >50%, the checklist is
too long; trim to the highest-signal items.

## Step 5 — Pair with a defect-raising flow

Same as
[`manual-test-script-author`](../manual-test-script-author/SKILL.md)
Step 6 — checklist failures need a path to a logged defect:

```markdown
### Defects raised this run

| # | Item                                          | Observed                            | Severity | Bug ID  |
|---|-----------------------------------------------|-------------------------------------|----------|---------|
| 1 | Promo code: apply WELCOME10                   | Subtotal stayed at $24.99           | high     | BUG-987 |
```

## Step 6 — Versioning

The checklist evolves with the product. Keep it in `docs/`:

```
docs/checklists/
├── prod-smoke-v1.md
├── prod-smoke-v2.md          ← current
├── on-call-first-pass-v1.md
└── bug-bash-checkout-v1.md
```

Bumping the version when the items change (rather than mutating
in place) preserves the historical record — useful for audit
("what did the smoke check on 2026-04-15?") and for retrospective
on incidents that the smoke missed.

## Output format

```markdown
## Test execution checklists — `<feature/area>`

**Generated from:** `<source — TC suite / test plan / story>`
**Total items:** N
**Total wall-time budget:** M minutes
**Scope:** smoke | first-pass | full sweep | compliance

(per-checklist bodies follow per Step 3)

### Coverage notes

- Auth flow: N items covering login + logout + password reset
- Cart flow: N items covering add + view + checkout
- Areas NOT covered (intentional): admin panel (out of smoke scope),
  internationalized currencies (covered weekly via `prod-smoke-i18n.md`)
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| 50-item flat list                                                      | Tester loses focus; coverage drops mid-run.                              | Group by flow, ≤8-10 items per group (Step 3). |
| Items with multi-line steps                                            | Defeats the checklist's purpose (one-line scan).                         | Split or move to full step-table (Step 2). |
| No time budget                                                          | "When you have time" → never run.                                        | Per-group budget (Step 4). |
| One generic checklist for "everything"                                  | Tries to be smoke + UAT + compliance; serves none well.                  | Per-purpose checklists; pick scope first (Step 1). |
| No defect-raising integration                                           | Failed items get logged in chat; the run record is incomplete.           | Defects-raised block in the sign-off (Step 5). |
| Checklist mutated in place (no version)                                 | Can't tell what was checked when; audit / incident analysis broken.      | Versioned files (Step 6). |
| "Smoke" check that takes 45 minutes                                     | Smoke ≠ full regression; team skips after deploy.                        | Hard cap at 10-15 min for smoke (Step 1 table). |

## Limitations

- **Subjective pass/fail.** A one-line check ("dashboard loads
  in <3s") relies on tester judgment. For exact-value checks,
  use the full step-table format.
- **Coverage gaps invisible.** A 10-item smoke won't catch a
  regression in the 100 areas it doesn't cover. Pair with full
  regression runs at lower frequency.
- **Tester fatigue.** Same checklist run daily becomes mechanical;
  testers stop noticing the failures. Rotate checklists per week
  / per tester to keep attention fresh.
- **No automation parity.** A passing manual checklist doesn't
  imply an automated suite would pass; the checks are different
  by design.

## References

- [`manual-test-script-author`](../manual-test-script-author/SKILL.md)
  — sibling: full step-table when more detail is needed.
- [`bug-bash-facilitator`](../bug-bash-facilitator/SKILL.md) —
  consumes a checklist as the bug-bash kickoff template.
- [`uat-script-author`](../uat-script-author/SKILL.md) — full UAT
  scripts when sign-off requires more than a checklist.
- [`smoke-suite-gate`](../../qa-process/skills/smoke-suite-gate/SKILL.md)
  (planned, qa-process Plugin 16) — automated equivalent for
  CI-runnable smoke.
