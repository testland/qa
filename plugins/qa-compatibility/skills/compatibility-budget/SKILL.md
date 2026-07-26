---
name: compatibility-budget
description: "Pure-reference for deciding how large a compatibility matrix a team can afford and for publishing that commitment - defines tier-1 (must work; per-PR) vs tier-2 (must work; nightly) vs tier-3 (should work; pre-release) vs unsupported, with example budgets per product type (web / desktop / mobile / library), the matrix-size cost / coverage trade-off, and 'what we support' external templates. Use when a team must cap how many browser / OS / runtime combos it commits to, or must publish a support policy. This is the BUDGET and support-statement gate - for the traffic-share analysis that picks WHICH specific browsers belong in each tier use browser-matrix-strategy-reference; to execute the resulting matrix use the runners browser-matrix-runner (bundled engines) or selenium-grid-4-runner (self-hosted)."
---

# compatibility-budget

## Overview

Without an explicit budget, "compatibility" creeps:

- An engineer adds a Firefox-only fix; the team commits to Firefox
  forever.
- A user complains about Internet Explorer; an engineer checks
  for IE; tests now must run on IE.
- A new Chrome version breaks something; the team scrambles
  reactively.

A **compatibility budget** is a deliberate decision: which
configurations the team commits to support, at what tier, with
what consequences for unsupported configurations.

## When to use

- A new product launches; team needs to decide initial support.
- An existing product's compatibility statement needs auditing.
- A bug report comes in for an unsupported configuration; the team
  needs the documented stance.
- A contractual obligation requires a compatibility statement.

## How to use

1. Pick the product type and copy the closest example budget from [references/compatibility-budget-tiers.md](references/compatibility-budget-tiers.md).
2. Assign each candidate browser / OS / runtime combo a tier - Tier 1, 2, 3, or unsupported (§1).
3. Count combos per tier against the cost / coverage trade-off (§3); if CI cost exceeds budget, demote the lowest-value combos.
4. Reconcile the Tier 1 list with user-agent telemetry (§6) so it matches real traffic.
5. Publish the external "what we support" statement (§4).
6. Schedule a quarterly review (§5) to promote or retire combos as versions evolve.

## §1 - Tier model

Four tiers signal **engineering investment**, not user importance - a low-traffic configuration under contractual obligation may still be Tier 1:

- **Tier 1** - must work; per-PR smoke.
- **Tier 2** - must work; nightly full suite.
- **Tier 3** - should work; pre-release manual / weekly.
- **Unsupported** - out of scope; bugs closed as "not supported."

Full definitions and CI cadence: [references/compatibility-budget-tiers.md](references/compatibility-budget-tiers.md).

## §2 - Example budget per product type

Worked starting budgets for a modern web app, an internal SaaS, an open-source library, and a mobile native app are tabulated in [references/compatibility-budget-tiers.md](references/compatibility-budget-tiers.md). Copy the closest template and adjust each combo's tier against your telemetry (§6).

## §3 - Cost / coverage trade-off

The budget directly affects CI cost:

```
CI cost = N_tier1 × per_PR_cost + N_tier2 × nightly_cost + N_tier3 × manual_review_cost
```

For a typical web product (5 Tier 1 configs + 2 Tier 2 + 4 Tier
3):

- Tier 1: 5 × ~30 PRs/day × ~3 min = ~7.5 hours/day of CI runner
  time per PR-set.
- Tier 2: 2 × 1 nightly × ~30 min = ~1 hour/day.
- Tier 3: 4 × ~weekly × ~4 hours of manual time = manual budget.

A team's CI budget caps the total; the budget shapes the matrix.

## §4 - "What we support" template

Publish externally (docs, marketing, README):

```markdown
# Browser / OS support

We officially support:

## Tier 1 (per-release tested)
- Chrome (current + 1 prior major version)
- Edge (current)
- Safari (current + 1 prior major version)
- iOS Safari (current + 1 prior major version)
- Chrome on Android (current)

## Tier 2 (nightly tested; bugs fixed within 1 release)
- Firefox (current)

## Tier 3 (best-effort; bugs may take longer to fix)
- Firefox on Android
- Samsung Internet

## Unsupported
- Internet Explorer 11 - last supported v1.4.0 (EOL 2025-12-31).
- Chrome < version 100 - security vulnerabilities; not supported.
- Older mobile OSes - see mobile platform support table.

If you experience an issue on a Tier 3 or unsupported configuration,
please open an issue but understand the priority is lower.
```

The external statement sets user expectations; the internal tiers
guide engineering.

## §5 - Quarterly review

Browsers / OS / runtime versions evolve; the budget needs review:

| Trigger                                      | Action                                |
|----------------------------------------------|---------------------------------------|
| New major OS / browser release                | Add to Tier 1; re-evaluate older.    |
| Tier 3 configuration generates >5 issues      | Promote to Tier 2 OR retire to unsupported. |
| Tier 1 configuration generates 0 issues / quarter | Consider demoting (controversial - get team consensus). |
| Vendor announces EOL                          | Move to unsupported on EOL date.     |

## §6 - User-agent telemetry → budget

If the team has analytics on browser / OS distribution, use it:

| Browser              | % of users (last 30d) | Recommended tier |
|----------------------|----------------------:|-------------------|
| Chrome 130             |              42%       | Tier 1            |
| Chrome 129             |              18%       | Tier 1            |
| Safari 18              |              15%       | Tier 1            |
| iOS Safari 18          |              10%       | Tier 1            |
| Edge 130               |               5%       | Tier 1 / 2        |
| Firefox 132            |               4%       | Tier 2            |
| Chrome 128 and older   |               3%       | Tier 3            |
| Other (long tail)      |               3%       | Tier 3            |

The 80/20 rule: if a configuration has <1% usage, Tier 3 or
unsupported. If <0.1%, unsupported.

## Worked example

A mid-size web app team caps its browser scope:

- **Tier 1 - 6 combos, per-PR smoke:** Chrome current + prior, Edge current, Safari current + prior, iOS Safari current, Chrome on Android current. Telemetry (§6) shows these cover ~90% of traffic.
- **Tier 2 - 4 combos, nightly:** Firefox current, Safari prior, iOS Safari prior, Samsung Internet.
- **Tier 3 - best-effort:** Firefox on Android; anything below Chrome 100.
- **Unsupported:** Internet Explorer; Chrome < 100.

Cost check (§3): 6 Tier 1 combos on per-PR smoke stay inside the CI budget while 4 Tier 2 combos run once nightly. The team publishes the §4 support statement listing the three tiers plus the unsupported set, then calendars the §5 quarterly review. Result: cross-browser scope is capped at 10 committed combos behind a documented, defensible support policy.

## §7 - Compatibility statement vs accessibility commitment

These are different:

- **Compatibility:** which configurations the product runs on.
- **Accessibility:** which assistive technologies the product
  supports (per WCAG conformance - see
  `wcag-compliance-reporter` in the qa-accessibility plugin).

A user with a screen reader on Tier 1 Chrome should have Tier 1
accessibility experience. The two budgets compose.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| No documented budget                                                  | Compatibility creeps; surprise costs.                                    | Author per §2 + publish per §4. |
| Tier 1 = "everything we can test"                                      | CI cost explodes.                                                         | Tier 1 should be the minimum-viable; promote consciously. |
| Unsupported = "we don't talk about it"                                 | Users assume support exists; complaints surprise.                        | Explicit unsupported list (§4). |
| Quarterly review missed                                                | Budget stale; supports end-of-life software.                              | Calendar invite (§5). |
| User-agent telemetry ignored                                            | Tier 1 list doesn't match reality.                                       | Use telemetry (§6). |
| Same budget across product variants                                    | A B2B SaaS doesn't need the same browser support as a consumer site.    | Per-product budget (§2 examples). |

## Limitations

- **Telemetry availability.** Without analytics, the budget is
  guesswork.
- **Vendor lifecycle visibility.** Browser / OS EOL dates aren't
  always announced far in advance.
- **User population may differ from telemetry.** Users hitting bug
  reports may use older browsers than the active user base.
- **"Best-effort" Tier 3 is squishy.** Define the SLO explicitly
  (e.g., "Tier 3 bugs reviewed monthly; no SLA on fix").

## References

- [references/compatibility-budget-tiers.md](references/compatibility-budget-tiers.md) - detailed tier definitions and per-product-type example budgets.
- `browser-matrix-runner` - 
  the runner this budget configures.
- `os-matrix-runner` - sibling for
  OS matrix.
- `mobile-device-matrix-toolkit` (in the qa-mobile plugin) - mobile-specific equivalent.
- `wcag-compliance-reporter` - accessibility compliance complement to the compatibility budget.
