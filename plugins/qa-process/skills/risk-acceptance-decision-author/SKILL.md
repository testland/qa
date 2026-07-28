---
name: risk-acceptance-decision-author
description: "Build-an-X workflow that produces a structured risk-acceptance decision document - for risks the team has decided to accept (rather than mitigate / transfer / avoid). Walks the author through the ISO 31000 risk-acceptance criteria (rationale, sign-off, scope, review trigger, exit conditions), captures stakeholder approval, and links to the originating risk register entry. Output is a Markdown decision artefact that lives alongside the risk register and provides audit-defensible justification for the team's acceptance choice. Use when a risk register entry's Strategy column is set to Accept, or an already-accepted risk comes up for its scheduled re-review, an audit, or a post-incident look-back."
---

# risk-acceptance-decision-author

## Overview

Of the four ISO 31000:2018 risk responses, only **Accept** produces a decision
artefact (Avoid / Mitigate / Transfer all produce work). Accept-without-document
is the common failure: the risk is silently de-prioritised, nobody remembers why,
and the post-mortem finds no paper trail. This skill closes that gap.

Per ISTQB CTAL-TM ch. 5 on risk-response strategies (cite by stable ID).

## When to use

- A risk register entry's "Strategy" column has been set to
  "Accept" - open the decision document immediately.
- Annual review of accepted risks - re-justify acceptance with
  current data.
- Audit prep - assemble the accepted-risk decision trail.
- Post-incident review - if an accepted risk triggered, document
  whether the acceptance was justified given what was known at
  the time.

## Step 1 - Identify the risk being accepted

Pull the entry from the relevant register:

- `risk-matrix` per-release
- `product-risk-register-builder` product-level
- `project-risk-register-builder` project-level

Cross-reference: risk ID, score, category, current mitigations
already in place.

## Step 2 - State the rationale

The hardest part. Common defensible rationales:

| Rationale | When applicable | Anti-rationale (do NOT accept this) |
|---|---|---|
| **Cost of mitigation > expected loss** | Quantified: mitigation costs $100k; expected loss = score × loss-per-incident < $100k | "Mitigation is hard" - without quantification |
| **Mitigation degrades user experience** | E.g., rate-limiting risk; mitigation = strict throttle, would hurt 95% of users to catch <1% abuse | Without UX measurement |
| **Risk is in a deprecated subsystem** | Subsystem retiring within N quarters; mitigation effort wasted | "We'll get to it eventually" |
| **Risk likelihood demonstrably low** | Historical data: 0 incidents in 36 months of comparable systems | Hand-wave likelihood claim |
| **Compensating monitoring exists** | Real-time alert on the risk's failure mode; can respond fast enough that detect→fix < tolerable downtime | "We'll notice" |

## Step 3 - Sign-off + scope

Two questions need explicit answers:

1. **Who signs off?** - Authority level should match score:
   - Score 1-5: Tech lead
   - Score 6-9: Engineering manager
   - Score 10-14: Director + QA lead
   - Score 15-19: VP + Security / Legal sign-off if applicable
   - Score 20-25: Executive sign-off (CTO / CISO depending on
     category)

2. **What scope does the acceptance cover?**
   - Only this release? (Scope: release tag)
   - Across all releases until N? (Scope: time-bound)
   - Indefinitely until conditions change? (Scope: conditions)

## Step 4 - Review trigger + exit conditions

A risk acceptance is **not permanent**. Document the trigger that
re-opens the decision:

| Trigger | Example |
|---|---|
| Time | "Re-review at end of Q4 2026" |
| Score change | "Re-review if likelihood ≥ 4 or if any related incident occurs" |
| External event | "Re-review on regulatory change (e.g., new GDPR enforcement guidance)" |
| Architectural change | "Re-review if subsystem moves out of deprecation" |
| Volume threshold | "Re-review when user count crosses 10x current" |

At minimum: time + score-change trigger. Indefinitely-accepted
risks (no trigger) are anti-patterns.

## Step 5 - Author the decision document

Assemble the fields from Steps 1-4 into one versioned Markdown document with these
sections, in order: a header (risk, register-entry link, current score, decision,
decided-by), Rationale (with the quantified expected-loss analysis), Scope, Sign-off
(at the authority Step 3 requires), Review triggers (time + score-change minimum),
Compensating controls (named monitors, alerts, runbooks), and a History log.

Two filled examples - a cost-justified acceptance (PR-008) and a high-score S4
security acceptance (R-99) - are in [references/example-decisions.md](references/example-decisions.md).

## Step 6 - Link bidirectionally

Update the risk register entry:

```markdown
| PR-008 | Legacy CSV import OOM | 3 | 3 | 9 | Accept | See [risk-acceptance-decision-author/PR-008.md](decisions/PR-008.md) | <owner> | Active |
```

And add to the decisions index:

```markdown
# Risk acceptance decisions - index

| Decision | Risk | Score | Decided | Next review |
|---|---|---:|---|---|
| [PR-008](decisions/PR-008.md) | Legacy CSV import OOM | 9 | YYYY-MM-DD | Q4 2026 |
| [R-22](decisions/R-22.md) | Cyber-week scope-creep risk | 12 | YYYY-MM-DD | Post-launch |
| ... | ... | ... | ... | ... |
```

## Step 7 - Annual review log

```markdown
## Q4 2026 review of PR-008

- Customer count: 14 (was 12 at decision time; +17%)
- OOM events YTD: 0
- Likelihood reassessment: still ~3; no observed increase
- Decision: **Re-accept** until end of Q2 2027
- Re-signed: <names> ✓ YYYY-MM-DD
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Accept without document | Decision rationale lost; auditor finds nothing | Always author a decision per accepted risk |
| Indefinite acceptance (no review trigger) | Risk silently persists into next product cycle | Always set at least time + score-change triggers |
| Sign-off at lower authority than the score warrants | Decisions undocumented at the right level; audit fails | Step 3 authority-matching matrix |
| Hand-wave rationale | "We'll just monitor" without specifics - fails post-mortem | Quantify (cost, probability, compensating control); name specific monitors |
| No compensating controls | Acceptance = "we hope nothing bad happens" | Document detective controls (monitoring, alerts, runbooks) |
| Acceptance hidden in a comment field | Not searchable, not auditable | Versioned Markdown in repo; index file |

## Limitations

- **Quantification is hard.** Annualised loss expectation
  estimates are imprecise; the discipline is in being explicit
  rather than precise.
- **Sign-off chain depends on org structure.** The matrix in
  Step 3 is a default; adapt to actual org authorities.
- **Doesn't cover statutory non-acceptance.** Some risks (e.g.,
  GDPR violations) can't be accepted regardless of cost - the
  authority isn't yours to delegate. Flag these explicitly.
- **Annual review can be performative.** Just re-stamping
  without re-evaluating isn't real review.

## References

- ISO 31000:2018 "Risk management - Guidelines" §6.5
  (risk-treatment options including acceptance) - cite by stable
  ID.
- ISTQB Advanced Test Manager (CTAL-TM) syllabus, ch. 5.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/) - "risk
  acceptance".
- ISO/IEC 27005:2022 (information security risk management) - 
  alternate authority for security-domain acceptance decisions;
  cite by stable ID.
- Sibling skills:
  `product-risk-register-builder`,
  `risk-matrix`,
  `project-risk-register-builder`.
