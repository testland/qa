---
name: fcc-cuts-vids-heuristic
description: "Pure-reference catalog of James Bach's FCC CUTS VIDS heuristic - a 10-letter mnemonic for the dimensions a tester catalogs when MODELLING a system: Format, Constraints, Connections; Coverage, Users, Tasks, Sequences; Variables, Inputs, Data, Storage. Use pre-session to build the system model a charter will explore. For what to VARY use sfdpot-exploratory-heuristic, for oracles (is it a bug?) use hiccupps-f-heuristic, for quality criteria use crusspic-stmpl-heuristic."
---

# fcc-cuts-vids-heuristic

## Overview

FCC CUTS VIDS is one of James Bach's lesser-known but powerful
exploratory-testing heuristics. Where SFDPOT (
`sfdpot-exploratory-heuristic`) catalogues what
to *vary*, FCC CUTS VIDS catalogues what to *model*. The
distinction: variation drives the session; modelling is what the
tester learns *about* the system as exploration progresses.

Published in the Rapid Software Testing curriculum (
[satisfice.com/rapid-software-testing](https://www.satisfice.com/rapid-software-testing))
and referenced widely in Bach + Bolton teaching material.

This skill is a **pure reference** consumed by senior testers
building system models.

## When to use

- Pre-session: build a model of the system the charter will
  explore. Walk FCC CUTS VIDS to enumerate what the tester needs
  to know.
- Mid-session: tester finds a gap in their understanding - pick
  the relevant letter and investigate.
- Post-session: catalogue what the session *taught* about each
  dimension so the next session builds on the model.
- Onboarding: a new tester learning a system uses FCC CUTS VIDS
  as the model-building rubric.

## How to use

1. **Name the target.** State the system + charter scope in one line
   (e.g. "the checkout flow").
2. **Walk the three groups.** FCC (system shape), CUTS (user shape),
   VIDS (data shape) - fill in what you know for each of the 10 letters,
   pulling prompts + examples from
   [references/dimensions-catalog.md](references/dimensions-catalog.md).
3. **Flag the unknowns.** Any letter you can't fill is a gap to
   investigate before or during the session.
4. **Keep the confusable pairs straight.** V vs I (V = system-owned
   state, I = user-supplied) and T vs F (Task = user goal, not feature
   label) - see Anti-patterns.
5. **Turn the model into charter targets.** Point a session at the
   riskiest dimensions (e.g. D + S, where stores disagree about state).
6. **Update the model after each session** so the next one builds on it.

## The ten dimensions

FCC CUTS VIDS groups ten model-able dimensions into three shapes. Full
prompt + concrete enumeration per letter:
[references/dimensions-catalog.md](references/dimensions-catalog.md).

| Group | Letter | Models |
|---|---|---|
| **FCC** (system shape) | **F - Format** | shape / format of inputs + outputs (file, message, layout, encoding) |
| | **C - Constraints** | rules the system enforces (schema, business, perf, security, regulatory) |
| | **C - Connections** | what it integrates with (external / internal services, stores, queues, clients) |
| **CUTS** (user shape) | **C - Coverage** | behaviour categories the product claims to cover |
| | **U - Users** | who uses it and how (personas, skill, context, programmatic) |
| | **T - Tasks** | user goals that span features |
| | **S - Sequences** | expected orderings of user actions |
| **VIDS** (data shape) | **V - Variables** | internal runtime values (flags, thresholds, env, cache) |
| | **I - Inputs** | external data crossing in (user-supplied) |
| | **D - Data** | what the system stores / processes / produces |
| | **S - Storage** | where + how data persists |

## Worked example - building a checkout-system model

```markdown
**System:** Checkout flow (cart → payment → confirmation)

**F - Format:** Cart JSON; payment-intent JSON (Stripe); webhook
HTTP/JSON; receipt PDF; order email HTML.

**C - Constraints:** Cart total > $0.01; max 100 items; promo
expiry; tax-jurisdiction rules per locale; PCI scope for card
data.

**C - Connections:** Stripe (payment intent + webhook); SendGrid
(receipt email); inventory service (stock-lock); tax service
(Avalara); identity service (auth).

**C - Coverage:** Standard checkout; gift-card checkout; subscription
checkout; bulk-B2B checkout. NOT covered: split-tender, multi-currency
within one cart.

**U - Users:** Anonymous, free, paid, B2B admin, partner-integration.

**T - Tasks:** "Buy this item", "Apply my promo", "Use my saved
card", "Get a receipt for expenses".

**S - Sequences:** Add → cart → checkout → pay → confirm; resume
abandoned cart; refund flow.

**V - Variables:** `feature-new-checkout`, `max-cart-items`, `tax-fallback-rate`,
`stripe-timeout-ms`.

**I - Inputs:** Cart contents (user input); promo code (user input);
payment method (user input); shipping address (user input).

**D - Data:** Order record; payment record; tax record; promo-usage
record; inventory deduction.

**S - Storage:** Orders in Postgres; payments in Stripe (external);
cart in Redis (TTL 24h); receipts in S3 (immutable).
```

Now the charter has a tangible model to reference: "Explore the
checkout flow's data lifecycle (D + S in FCC CUTS VIDS) - focusing
on edge cases where Postgres + Stripe + Redis disagree about state."

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skipping FCC CUTS VIDS for "simple" systems | Even simple systems have model-able dimensions; skipping = under-prepared | Always do at least a sketched model |
| Confusing V (Variables) with I (Inputs) | Internal-state bugs masquerade as input-handling | V = system-owned; I = user-supplied |
| Confusing T (Tasks) with F (Function in SFDPOT) | Functions are mechanical; tasks are goal-oriented | Task = user's goal, not feature label |
| Modelling once, then never updating | System evolves; model gets stale | Update model per session |
| Trying to write a complete model before any session | Analysis paralysis; never starts exploring | Sketch the model; refine via sessions |

## Limitations

- **Modelling is upfront work.** For small targets, the time
  doesn't pay back.
- **Some dimensions hard to enumerate.** Connections may be opaque
  in monoliths; Coverage claims may differ from reality.
- **Model doesn't replace exploration.** It's a starting frame;
  the session refines + extends it.
- **Sequence + Operations overlap.** Test discipline by treating
  Sequences as expected paths; Operations as variation of them.

## References

- Bach J. + Bolton M. *Rapid Software Testing* curriculum - 
  [satisfice.com/rapid-software-testing](https://www.satisfice.com/rapid-software-testing).
- Bach J. *Heuristics of Software Testability* - 
  [satisfice.com/heuristics-of-software-testability](https://www.satisfice.com/heuristics-of-software-testability).
- Bolton M. - [developsense.com](https://developsense.com/) on
  testing heuristics.
- Full per-dimension modelling prompts + enumeration:
  [references/dimensions-catalog.md](references/dimensions-catalog.md).
- Sibling references:
  `hiccupps-f-heuristic`,
  `sfdpot-exploratory-heuristic`,
  `crusspic-stmpl-heuristic`,
  `session-based-test-management-reference`.
