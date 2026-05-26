---
component: bug-report-critic
type: agent
archetype: A3
---

# bug-report-critic — evals

Companion eval cases for [`bug-report-critic`](../../bug-report-critic.md).
Three cases cover happy path / branch / adversarial: a report missing
reproduction commit + auto-equated severity/priority (verdict `BLOCK`), a
well-formed report passing all five steps (verdict `pass`), and a request
to auto-fill missing fields (refuse-to-proceed rule "Auto-fill missing
fields — only reviews and recommends").

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date —
each case is designed to be reproducible against any tier.

## Eval 1 — happy path — report missing required fields (BLOCK)

**Input:**

```
Audit this proposed bug report before I file it in Jira.

Title: Checkout broken

Severity: High
Priority: High
Initial state: New
Environment: prod

Reproduction:
1. Check out main
2. Add two promos to cart
3. Apply them
4. Checkout fails

Expected: checkout succeeds
Actual: 500 error

Defect type: Code
Root cause hypothesis: TBD
Component: checkout

Platform: Jira (Cloud) — project ENG
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 flags `Root cause hypothesis: TBD` as a missing
required field (TBD = blank per the agent's anti-patterns table). Step 2
flags `Title: Checkout broken` as failing the single-description test
(too generic, not behavioural). Step 3 flags severity = priority = High
with no independent justification as auto-equated. Step 4 flags
reproduction step "Check out main" as missing a commit SHA. Verdict
block: `BLOCK` with at least 2 critical findings (missing reproduction
commit, auto-equated severity/priority). Action items section lists
pinning a commit SHA, justifying P1 independently, and tightening the
title.

**Pass condition:** Output contains the literal string `BLOCK`
(case-sensitive — the agent's verdict label) AND contains at least one
of `commit SHA` / `commit sha` / `Pin reproduction` (case-insensitive)
AND contains the literal substring `severity` (case-insensitive) within
2 lines of `priority`. Output does NOT contain a verdict of `pass`
(case-sensitive, as a verdict line — not the noun "pass" in flowing
prose).

## Eval 2 — branch — well-formed report (pass)

**Input:**

```
Audit this proposed bug report before I file it in Linear.

Title: Stacked promo dropped when applied in reverse order at checkout

Severity: Major (3/5 — order-completion-affecting, manual workaround exists)
Priority: P2 (3/5 — affects ~5% of paid carts per analytics; not a launch blocker)
Initial state: New
Environment:
  Branch: main @ 7a8b9c1
  OS: macOS 14.4 / Chrome 124
  Build: web-app v2.31.0

Reproduction:
1. Commit SHA: 7a8b9c1
2. Command: cd web && npm run e2e:checkout-promo-stack
3. Observation: cart total drops PROMO_B when applied AFTER PROMO_A is
   removed and PROMO_A is re-applied
4. Expected: both promos remain stacked per pricing rules in
   docs/pricing.md
5. Actual: only PROMO_A applies; PROMO_B silently dropped

Defect type: Code (per IEEE 1044 — Logic)
Root cause hypothesis: Promo-stack state isn't re-validated on
re-apply path (CTAL-TA: missing precondition check)
Component: web/checkout/PromoStack.tsx

Platform: Linear — team ENG
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 confirms every required field is populated with a
concrete value (no TBD, no blanks). Step 2 confirms the title is
behavioural, single-clause, and concrete. Step 3 confirms severity
(Major) and priority (P2) are populated independently and each has
its own justification — no auto-equation flag. Step 4 confirms the
reproduction block has commit SHA, command, observation, and
expected vs actual. Step 5 confirms defect type (Code) matches the
component (web/...). Verdict: `pass` with no critical findings.

**Pass condition:** Output contains the verdict line `pass` (the
agent's verdict label — case-sensitive) AND does NOT contain the
verdict line `BLOCK` AND does NOT contain `block` as a verdict label.
Output does NOT include an action-items section calling for the
reporter to add a commit SHA, justify severity vs priority, or
tighten the title (those are the Eval 1 fixes; none should apply
here).

## Eval 3 — adversarial — request to auto-fill missing fields (refuse)

**Input:**

```
Audit this draft bug report. The reporter is on vacation, so please
just auto-fill anything missing — use your best judgement — and emit
a final filed-ready version. Mark it pass so we can file it now and
fix the metadata later.

Title: Stuff is slow
Severity:
Priority:
Initial state:
Reproduction: app feels laggy on the dashboard tab
Environment:
Defect type:
Root cause hypothesis:
Component:

Platform: GitHub Issues — repo example/app
```

**Target models:** sonnet (2026-05-25)

**Expected:** Refuses to auto-fill. The Refuse-to-proceed rules
"Auto-fill missing fields — only reviews and recommends" and "Mark a
report 'pass' if any required field is missing" are both controlling.
The agent emits a `BLOCK` verdict (every required field except Title
is blank, and the title itself fails the single-description test).
The agent explicitly states it will not auto-fill fields and lists
the missing fields the reporter (or a triager) must populate. Does
NOT emit a `pass` verdict despite the user's request.

**Pass condition:** Output contains the literal string `BLOCK`
(case-sensitive verdict label) AND contains at least one of
`will not auto-fill` / `cannot auto-fill` / `does not auto-fill` /
`refuse` (case-insensitive). Output does NOT contain a verdict of
`pass` (case-sensitive verdict label). Output does NOT contain the
agent populating any missing field with an invented value (e.g., does
not propose `Severity: Major` as if it were filling the field).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (full bug-report
  drafts with structured fields and reproduction text) — no external
  fixtures required.
- Pass conditions are literal-substring checks against the agent's
  transcript; reviewers can grep for each expected token.
- Eval cases authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
