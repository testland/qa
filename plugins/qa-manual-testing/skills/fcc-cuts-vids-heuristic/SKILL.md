---
name: fcc-cuts-vids-heuristic
description: "Pure-reference catalog of James Bach's FCC CUTS VIDS heuristic - a 10-letter mnemonic for the dimensions a tester catalogs when *modelling* a system. FCC: Format, Constraints, Connections. CUTS: Coverage, Users, Tasks, Sequences. VIDS: Variables, Inputs, Data, Storage. Use as the system-modelling checklist that complements SFDPOT (what to vary) and HICCUPPS-F (what to compare against)."
---

# fcc-cuts-vids-heuristic

## Overview

FCC CUTS VIDS is one of James Bach's lesser-known but powerful
exploratory-testing heuristics. Where SFDPOT (
[`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md)) catalogues what
to *vary*, FCC CUTS VIDS catalogues what to *model*. The
distinction: variation drives the session; modelling is what the
tester learns *about* the system as exploration progresses.

Published in the Rapid Software Testing curriculum (
[satisfice.com/rapid-software-testing](https://www.satisfice.com/rapid-software-testing))
and referenced widely in Bach + Bolton teaching material.

This skill is a **pure reference** consumed by
[`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md)
and senior testers building system models.

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

## The ten dimensions

### FCC (the system shape)

#### F - Format

> What is the **shape / format** of inputs + outputs?

Specific data formats the system reads + writes:

- File formats (CSV, JSON, XML, PDF, Avro, Parquet)
- Message formats (HTTP / gRPC / MQTT)
- Data layouts (column vs row store; documents vs relations)
- Encodings (UTF-8, base64, hex)

Modelling Format means listing every format the system touches - 
including where format boundaries are (parser, serialiser,
transport layer).

#### C - Constraints

> What are the **rules** the system enforces?

- Schema constraints (column type, NOT NULL)
- Business rules (max 5 orders per cart)
- Performance constraints (response within 200ms)
- Security constraints (auth required before /admin)
- Regulatory constraints (no PII in logs)

Constraints define what *should* happen; exploration tests whether
the system holds them under stress.

#### C - Connections

> What does the system **integrate with**?

- External services (third-party APIs, payment processors, identity
  providers)
- Internal services (microservice topology)
- Databases / data stores
- Event buses / queues
- Filesystems / blob storage
- Browsers / clients

Each connection is a potential boundary where things can fail - 
prime exploration territory.

### CUTS (the user shape)

#### C - Coverage

> What **categories** of behaviour does the system cover?

Where in the feature space does the system claim to operate? Not
*what tests cover the code* (that's
[`qa-test-impact-analysis`](../../../qa-test-impact-analysis/)) - 
this is *what the product claims to do*.

#### U - Users

> Who **uses** the system, and how?

- User personas (anonymous visitor, free user, paid customer,
  admin, partner)
- User-skill levels (novice, expert)
- User-context (mobile in transit, desktop at work, screen-reader user)
- Programmatic users (API consumers, scripts, bots)

Modelling Users surfaces "who's a tester *for* this system?"

#### T - Tasks

> What **goals** do users have when using the system?

Not features (that's part of F - Function in SFDPOT). Tasks:

- "Get my package delivered by Friday"
- "Cancel my subscription before next billing cycle"
- "Find what the team did this week"

Tasks span features. A bug that breaks a task (even if every
feature works individually) is high-impact.

#### S - Sequences

> What **orderings** of user actions are expected?

- Onboarding sequence (sign-up → verify email → first action)
- Normal workflow sequences
- Recovery sequences (after error → retry → success)
- Edge sequences (cancel mid-flow, navigate away)

Sequences differ from Operations (SFDPOT) - Sequences is the
*shape* of expected user paths; Operations is the *variation* of
how users navigate them.

### VIDS (the data shape)

#### V - Variables

> What **runtime values** vary, and within what bounds?

System-level variables - settings, configs, feature flags. These
aren't user inputs; they're values the system holds + uses to
behave differently:

- Feature flags
- Tunable thresholds (max retries, timeout values)
- Environment-specific settings
- Cached values (TTLs, refresh policies)

#### I - Inputs

> What does the system **receive** from outside?

User-supplied data - distinct from system variables. Bach's
distinction: Variables are *internal state*; Inputs are *external
data crossing into the system*.

#### D - Data

> What does the system **store / process / produce**?

The system's data lifecycle. What gets written + read + how it
flows through the system. Different from Input - Data is what
the system *owns + transforms*, not what arrives.

#### S - Storage

> Where and how does data **persist**?

- Database (Postgres, MySQL, DynamoDB)
- Cache (Redis, Memcached)
- Blob (S3, GCS)
- Local filesystem (tmpfs, persistent)
- Browser storage (localStorage, IndexedDB, cookies)
- Memory only (volatile)

Storage matters because durability + consistency expectations
differ across these layers.

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
- Sibling references:
  [`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md),
  [`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md),
  [`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md),
  [`sbtm-reference`](../sbtm-reference/SKILL.md).
- Consumed by:
  [`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md).
