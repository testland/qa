---
name: compatibility-budget
description: "Pure-reference for choosing the compatibility matrix - defines tier-1 (must work; covered per-PR) vs tier-2 (must work; covered nightly) vs tier-3 (should work; covered pre-release) vs unsupported (explicitly out of scope). Includes example budgets per product type (web / desktop / mobile / library), the matrix-size cost / coverage trade-off, and templates for documenting \"what we support\" externally. Use when a team needs to decide which browser / OS / runtime combinations to commit to."
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

## §1 - Tier model

| Tier         | Definition                                          | CI cadence       |
|--------------|-----------------------------------------------------|------------------|
| **Tier 1**    | Must work; failure blocks releases.                 | Per-PR smoke.    |
| **Tier 2**    | Must work; failure blocks releases on detection.    | Nightly full suite. |
| **Tier 3**    | Should work; broken-here is a known issue.          | Pre-release manual / weekly. |
| **Unsupported** | Explicitly out of scope; bugs closed as "not supported." | None.    |

The tier signals **engineering investment**, not user importance - 
a configuration with low traffic but contractual obligation may be
Tier 1.

## §2 - Example budget per product type

### Modern web app

| Configuration                | Tier   |
|------------------------------|--------|
| Chrome (current + 1 prior)    | 1     |
| Edge (current)                | 1     |
| Safari (current + 1 prior)    | 1     |
| Firefox (current)              | 2     |
| iOS Safari (current + 1 prior) | 1     |
| Chrome on Android (current)   | 1     |
| Firefox Android               | 3     |
| Samsung Internet              | 3     |
| Internet Explorer              | unsupported |
| < Chrome 100                   | unsupported |

### Internal SaaS (controlled audience)

| Configuration                  | Tier   |
|--------------------------------|--------|
| Chrome (latest stable)          | 1     |
| Chrome (current - 1 stable)     | 1     |
| Edge (latest)                   | 2     |
| Firefox                          | 3     |
| Safari                          | 3     |
| All others                      | unsupported |

### Open-source library

| Configuration                                       | Tier   |
|-----------------------------------------------------|--------|
| Node 18, 20, 22 on Linux                             | 1     |
| Node 18, 20, 22 on macOS                             | 2     |
| Node 18, 20, 22 on Windows                           | 2     |
| Bun (current)                                         | 3     |
| Deno (current)                                        | 3     |
| Older Node EOL versions                              | unsupported |

### Mobile native app

| Configuration                          | Tier   |
|----------------------------------------|--------|
| iOS 17, 16 (current + 1 prior)          | 1     |
| iOS 15                                  | 2     |
| iOS 14                                   | 3     |
| < iOS 14                                | unsupported |
| Android 14, 13                           | 1     |
| Android 12                               | 2     |
| Android 11                                | 3     |
| < Android 11                             | unsupported |

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

## §7 - Compatibility statement vs accessibility commitment

These are different:

- **Compatibility:** which configurations the product runs on.
- **Accessibility:** which assistive technologies the product
  supports (per WCAG conformance - see
  [`wcag-compliance-reporter`](../../../qa-accessibility/skills/wcag-compliance-reporter/SKILL.md)).

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

- [`browser-matrix-runner`](../browser-matrix-runner/SKILL.md) - 
  the runner this budget configures.
- [`os-matrix-runner`](../os-matrix-runner/SKILL.md) - sibling for
  OS matrix.
- [`mobile-device-matrix-toolkit`](../../../qa-mobile/skills/mobile-device-matrix-toolkit/SKILL.md) - mobile-specific equivalent.
- [`wcag-compliance-reporter`](../../../qa-accessibility/skills/wcag-compliance-reporter/SKILL.md) - accessibility compliance complement to the compatibility budget.
