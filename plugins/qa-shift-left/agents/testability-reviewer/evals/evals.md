---
component: testability-reviewer
type: agent
archetype: A3
---

# testability-reviewer — evals

Companion eval cases for [`testability-reviewer`](../../testability-reviewer.md).
Three cases cover happy path / branch / adversarial: a PRD with
classic untestable claims (verdict `BLOCK`), a clean Given/When/Then
story (verdict `OK`), and a typo-only diff that the agent should
treat as out-of-scope per its anti-patterns. Re-run by feeding the
**Input** block as the first user message and checking the agent's
output against the **Pass condition**.

## Eval 1 — happy path — PRD with classic ambiguity (BLOCK)

**Input:**

```
Review the testability of this PRD excerpt.

Source: prd/2026Q2-checkout-redesign.md lines 14-15.

> "We will improve the checkout flow to feel modern and respond
> quickly. Users on mobile should have a smooth experience."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Per Step 2 the agent tokenizes the PRD into claims. Per
the three heuristics: (a) "feel modern" fails Observable (no
threshold, no concrete state to observe); (b) "respond quickly" fails
Observable (no latency threshold); (c) "smooth experience on mobile"
fails Observable and Decidable (no operational pass/fail rule). Per
the verdict rule "BLOCK — any claim is `Block` severity (fails
Observable or Decidable)", the agent emits `BLOCK`. The findings
table lists each claim with the heuristic violated and a concrete
testable rewrite (e.g., "p95 page-load on /checkout ≤1.5s on 4G").

**Pass condition:** Output contains the literal string `BLOCK` AND
at least one of `Observable`, `Decidable`, or `p95` (the heuristic
label or a concrete rewrite-style threshold). Output does NOT contain
a final `OK` verdict line.

## Eval 2 — branch — bounded-only failure (REVIEW)

**Input:**

```
Review the testability of this acceptance criterion.

Source: Linear story LIN-7788, Description field.

> "When a user logs in, redirect them to their last-visited page."
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Per Step 2 the single claim is tokenized. The claim is
Observable (a redirect URL is observable from outside the system)
and Decidable (a test can deterministically check the post-login
URL), but fails Bounded — "last-visited page" doesn't say which
storage holds it, what stale-window applies, what to do when no
last-visited page exists, or whether external URLs are allowed.
Per the verdict rule "REVIEW — at least one claim is `Review`
(fails Bounded only — fixable inline)", the agent emits `REVIEW`.
The findings table includes a concrete rewrite that names
`localStorage.lastVisitedPath`, an in-app-path regex, a 7-day
stale-window fallback, and a default redirect target (e.g.,
`/dashboard`).

**Pass condition:** Output contains the literal string `REVIEW`
AND mentions `Bounded` (the violated heuristic). Output does NOT
contain a final `BLOCK` verdict line, AND does NOT contain a final
`OK` verdict line.

## Eval 3 — adversarial — typo-only diff (out-of-scope)

**Input:**

```
Review the testability of this PR description.

Source: PR #5511 description.

> "Fix three typos in the README.
>
> - 'recieve' → 'receive' on line 14
> - 'occured' → 'occurred' on line 27
> - 'seperately' → 'separately' on line 41"
```

**Target models:** sonnet (2026-05-25)

**Expected:** Per the "Anti-patterns the agent rejects" section, the
agent explicitly treats typos as out-of-scope: "Treating typos as
testability bugs. Misspellings are proof-reading, not testability —
out of scope." The PR description contains no "will / must / should"
claims about system behavior — Step 2 tokenization yields zero
testability claims. The agent declines to emit `BLOCK` / `REVIEW` /
`OK` findings on the typo list itself (typos are not claims). It
notes the input is out of scope for testability review and suggests
proof-reading / spellcheck as the right tool.

**Pass condition:** Output contains at least one of `out of scope`,
`out-of-scope`, `proof-reading`, `spellcheck`, or `not a testability`
(any of the refuse-style phrases). Output does NOT contain a
`BLOCK` finding row whose `Claim text` is one of `recieve`,
`occured`, `seperately`, or `Fix three typos`; and does NOT emit a
`Findings` table that classifies a typo as a testability violation.

## Reproducibility notes

- All three inputs are concrete pasted spec / PR / story text — no
  external Linear / Jira / GitHub fetch needed.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 D7 sub-checks
  (Evals exist, Multi-model coverage, Acceptance criteria, Adversarial
  coverage, Reproducibility).
