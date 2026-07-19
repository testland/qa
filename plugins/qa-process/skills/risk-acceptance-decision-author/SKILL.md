---
name: risk-acceptance-decision-author
description: "Build-an-X workflow that produces a structured risk-acceptance decision document - for risks the team has decided to accept (rather than mitigate / transfer / avoid). Walks the author through the ISO 31000 risk-acceptance criteria (rationale, sign-off, scope, review trigger, exit conditions), captures stakeholder approval, and links to the originating risk register entry. Output is a Markdown decision artefact that lives alongside the risk register and provides audit-defensible justification for the team's acceptance choice. Use when a risk register entry's Strategy column is set to Accept, or an already-accepted risk comes up for its scheduled re-review, an audit, or a post-incident look-back."
---

# risk-acceptance-decision-author

## Overview

Of the four ISO 31000:2018 risk responses, only **Accept** produces
a decision artefact (Avoid / Mitigate / Transfer all produce work).
Accept-without-document is the most common anti-pattern in
risk-based testing: a risk is silently de-prioritised, no one
remembers why, and three quarters later it triggers and the
post-mortem can't find a paper trail. This skill closes that gap.

Per ISTQB CTAL-TM ch. 5 on risk-response strategies (cite by
stable ID).

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

- [`risk-matrix`](../risk-matrix/SKILL.md) per-release
- [`product-risk-register-builder`](../product-risk-register-builder/SKILL.md) product-level
- [`project-risk-register-builder`](../project-risk-register-builder/SKILL.md) project-level

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

```markdown
# Risk acceptance decision - PR-008

**Risk:** Legacy CSV import endpoint accepts files up to 500MB
without streaming
**Risk register entry:** [PR-008 in product-risk-register-builder/SKILL.md](...)
**Score (current):** 9 (impact 3 × likelihood 3)
**Decision:** Accept
**Decided:** YYYY-MM-DD  **Decided by:** <names>

## Rationale

CSV import endpoint is used by ~12 customers monthly. Migration to
streaming parser would require:
- 2 sprint-weeks engineering effort
- Backwards-compat shim for 6 months
- Customer comms for any behavioural change

Expected loss analysis:
- OOM event probability in next year: ~15% (based on similar
  endpoints at peer companies)
- Per-event cost: 1 hour of P2 on-call + customer remediation
  (~$2k total)
- Annualised expected loss: ~$3.6k

Mitigation cost: ~$40k (engineering time + opportunity cost).

Acceptance is cost-justified. Compensating control: existing
Kubernetes memory-limit + OOM-killer logs trigger an on-call
alert within 30 seconds; rerun + fix process takes <15 minutes.

## Scope

This acceptance covers releases v3.0 through v3.6 (Q2 2026 - Q4
2026) inclusive. Re-review trigger conditions below.

## Sign-off

- Engineering manager: <name> ✓ YYYY-MM-DD
- QA lead: <name> ✓ YYYY-MM-DD

## Review triggers

Reopen this decision if ANY of:

1. **Time:** End of Q4 2026 (default review).
2. **Score change:** If likelihood rises to 4+ for any reason - 
   e.g., increased CSV-import customer volume.
3. **Incident:** Any production OOM event traced to this
   endpoint.
4. **Architectural:** If the CSV import endpoint moves out of
   deprecation (currently planned for v4.0 deprecation).
5. **Customer pressure:** If a customer formally requests
   streaming support.

## Compensating controls

- Kubernetes memory limit: 1Gi per pod (auto-OOM-kill at limit)
- Datadog monitor: `csv-import-oom-rate` - alert on any OOM
- Runbook: [`csv-import-oom-runbook`](runbooks/csv-import-oom.md)
- On-call SLA: 30s detection, 15min remediation

## History

- YYYY-MM-DD: Decision authored (this document)
- (future review entries logged here)
```

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

## Worked example - a security-risk acceptance (S4 score)

Some risks score high (≥15) but acceptance is still legitimate.
Example: a known-exploitable but rate-limited internal endpoint.

```markdown
# Risk acceptance decision - R-99 (Security)

**Risk:** Internal admin endpoint vulnerable to CSRF (low-likelihood
because authenticated session required, network-segmented)
**Score:** 15 (impact 5 × likelihood 3)
**Decision:** Accept

## Rationale

CSRF on internal admin endpoint. Likelihood 3 because:
- Requires authenticated admin session (auth-gated)
- Network-segmented to office VPN + on-prem only
- No external internet exposure

Mitigation = CSRF token rotation across 47 admin endpoints. Effort:
3 sprint-weeks. Risk reduction: likelihood 3 → 1.

Accepting because:
- Network segmentation already a compensating control
- Mitigation work would delay v3.0 launch by 3 weeks
- Q3 2026 already scheduled for admin-endpoint hardening

## Sign-off

- CISO: <name> ✓
- VP Engineering: <name> ✓
- Security review board: minutes attached

## Review trigger

- **Time:** End of Q3 2026 (when admin-endpoint hardening
  scheduled)
- **Score:** Any external internet-facing exposure of these
  endpoints
- **Incident:** Any CSRF attempt observed in logs
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Accept without document | Decision rationale lost; auditor finds nothing | Always author a decision per accepted risk |
| Indefinite acceptance (no review trigger) | Risk silently persists into next product cycle | Always set at least time + score-change triggers |
| Sign-off at lower authority than the score warrants | Decisions undocumented at the right level; audit fails | Step 3 authority-matching matrix |
| Hand-wave rationale | "We'll just monitor" without specifics - fails post-mortem | Quantify (cost, probability, compensating control); name specific monitors |
| No compensating controls | Acceptance = "we hope nothing bad happens" | Document detective controls (monitoring, alerts, runbooks) |
| Stale decisions never re-reviewed | Risk landscape evolves; old rationale no longer holds | Annual cycle minimum; quarterly for high-score |
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
  [`product-risk-register-builder`](../product-risk-register-builder/SKILL.md),
  [`risk-matrix`](../risk-matrix/SKILL.md),
  [`project-risk-register-builder`](../project-risk-register-builder/SKILL.md).
