---
name: tour-based-explorer-prompt
description: Pure-reference catalog of exploratory testing tours — heuristics that frame an exploratory session around a theme. The seven canonical tours from Whittaker's *Exploratory Software Testing* (2009): Feature tour, Money tour, Landmark tour, Intellectual tour, Bad-data tour, Configuration tour, Garbage collector's tour. Each tour has a mission, a typical signal it surfaces, and an example application. Use as the heuristics menu the charter author and tester pick from when designing a session.
rating: 22
d6: 3
archetype: S2
---

# tour-based-explorer-prompt

## Overview

A naïve exploratory session can drift — the tester clicks around
without a focusing lens. **Tours** solve this: each tour frames the
exploration around a theme that catches a specific class of bugs.

The seven canonical tours come from James Whittaker's *Exploratory
Software Testing* (2009, Addison-Wesley). They've been widely cited
in the testing community as the practitioner-emergent vocabulary for
exploration.

This skill is a **pure reference** — the charter author
([`exploratory-charter-author`](../../agents/exploratory-charter-author.md))
and the tester pick which tours to apply per session.

## When to use

- Authoring a charter and choosing which tours to suggest to the
  tester.
- Mid-session, the tester wants a different lens to break out of a
  rut.
- Onboarding new exploratory testers who need vocabulary for
  "what kind of testing am I doing right now?"

## Tour 1 — Feature tour

**Mission:** Visit every feature in scope at depth = 1.

**Signal:** "Does the feature exist? Does it open without an error?
Does its primary affordance work?"

**Example application:**

```markdown
**Charter:** Explore the dashboard.
**Feature tour:**
1. Open the dashboard. Pass.
2. Click "Notifications" → notification panel opens. Pass.
3. Click "Settings" → settings page loads. Pass.
4. Click "Reports" → 404. **FAIL** — investigate.
```

**When to use:** New feature; post-deploy smoke; feature-coverage
gap survey.

**When NOT to use:** Deep-dive sessions where the depth-1 sweep
provides no signal.

## Tour 2 — Money tour

**Mission:** Find every place money / pricing / currency / discount
appears; verify each.

**Signal:** Rounding errors, currency conversion drift,
discount-stacking bugs, free-shipping edge cases, locale-specific
formatting (€1.234,56 vs $1,234.56).

**Example application:**

```markdown
**Charter:** Explore promo code application.
**Money tour:**
1. Apply 10% off promo to a $24.99 cart. Verify subtotal = $22.49.
2. Apply 50% off promo to a $0.01 cart. Verify subtotal = $0.01 (rounding).
3. Apply 100% off promo to a free-shipping order. Verify shipping handling.
4. Apply two stackable promos. Verify the order of operations.
5. Apply a promo + state tax. Verify tax base.
```

**When to use:** Any feature touching money, pricing, billing.
**Critical for:** Checkout, billing, subscription management.

## Tour 3 — Landmark tour

**Mission:** Visit each "landmark" feature — the canonical user
journeys / hero flows.

**Signal:** Whether the marquee features still work after a
refactor; baseline confidence.

**Example application:**

```markdown
**Charter:** Verify post-refactor regression risks.
**Landmark tour:**
1. Sign up new account → confirm email → log in. **Hero flow.**
2. Add to cart → checkout → confirmation. **Hero flow.**
3. Cancel subscription → reactivate. **Hero flow.**
```

**When to use:** Post-refactor verification; pre-release smoke;
quarterly health check.

**When NOT to use:** When the team already has automated tests for
hero flows (those should run first; tour confirms behavior the
automation doesn't catch).

## Tour 4 — Intellectual tour

**Mission:** Explore the hardest-to-understand parts of the
product. The features that the team has trouble explaining.

**Signal:** Bugs in genuinely complex business logic where edge
cases lurk.

**Example application:**

```markdown
**Charter:** Explore the tax calculator's nexus rules.
**Intellectual tour:**
1. Order ships from CA to OR (no sales tax in OR). Verify tax = 0.
2. Order ships from CA to TX (Texas nexus). Verify TX tax applied.
3. Order ships from CA to NY (origin-based vs destination-based). Verify rule.
4. Order with mixed-tax-rate items. Verify per-item rate application.
5. Subscription order spanning a tax-rate change date. Verify proration.
```

**When to use:** Complex business logic (tax, billing,
permissioning, scheduling).

**Effort:** High. This tour requires the tester to understand the
domain — pair with a domain-expert "guide."

## Tour 5 — Bad-data tour

**Mission:** Feed pathological inputs and observe behavior.

**Signal:** Input validation bugs, error-handling gaps, security
vulnerabilities, locale parsing issues.

**Example application:**

```markdown
**Charter:** Stress-test the search input.
**Bad-data tour:**
1. Empty input. Verify behavior.
2. Single space. Verify trimming or rejection.
3. 5000-character input. Verify truncation or rejection.
4. SQL injection: `'; DROP TABLE users; --`. Verify escaping.
5. XSS: `<script>alert(1)</script>`. Verify sanitization.
6. Unicode bidi override (RLO): `‮`. Verify handling.
7. Right-to-left text: `مرحبا`. Verify rendering.
8. Emoji + ZWJ sequences: `👨‍👩‍👧‍👦`. Verify counting.
9. Null byte: `foo\0bar`. Verify handling.
```

Pair with [`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md)
for the canonical payloads (OWASP Top 10 + CWE Top 25).

**When to use:** Any input field (search, forms, URL params, file
upload).

## Tour 6 — Configuration tour

**Mission:** Vary the user's / system's configuration; observe
behavior changes.

**Signal:** Config-dependent bugs (feature flags off vs on, dark
mode vs light, locale variations, browser variations).

**Example application:**

```markdown
**Charter:** Verify checkout works under all account configurations.
**Configuration tour:**
1. New user, no payment method. Verify "add payment" prompt.
2. Existing user, expired card. Verify "update card" prompt.
3. EU user, GDPR consent banner active. Verify checkout flow.
4. Beta user with experiment flag `new-checkout=true`. Verify variant.
5. Admin impersonating a user. Verify behavior.
```

**When to use:** Multi-tenant / multi-config products; before
toggling a major feature flag.

Pair with [`feature-flag-test-harness`](../../../qa-test-environment/skills/feature-flag-test-harness/SKILL.md)
for the matrix-shard approach to flag-combination testing.

## Tour 7 — Garbage collector's tour

**Mission:** Visit every page / endpoint once. Don't deeply test;
just confirm presence.

**Signal:** Dead links, 404s, stale routes, removed-feature
breadcrumbs.

**Example application:**

```markdown
**Charter:** Pre-release sanity check.
**Garbage collector's tour:**
1. Walk through every nav item; confirm each loads.
2. Visit every footer link; confirm each loads.
3. Visit every URL listed in the sitemap; flag 404s.
4. Visit every documentation link from the in-app help.
```

**When to use:** Before a release; after a major refactor; periodic
health check.

**When NOT to use:** Replacing automated link-checking — the
garbage collector's tour is for **rendering** issues an automated
checker can't catch.

## Picking tours per charter

A 90-minute charter can include 1-3 tours. Pick based on the
mission:

| Mission                          | Recommended tours                                       |
|----------------------------------|---------------------------------------------------------|
| New-feature exploration          | Feature tour + Money tour (if money) + Bad-data tour    |
| Post-refactor regression check    | Landmark tour + Garbage collector's tour                 |
| Bug-cluster investigation         | Intellectual tour + Bad-data tour                        |
| Compliance / audit                | Money tour + Configuration tour                          |
| New tester onboarding             | Feature tour (alone) + reflection                        |

A charter with all 7 tours is too broad; the tester won't have
time to apply any of them well.

## Capturing tour findings

Per the PROOF debrief in
[`exploratory-charter-author`](../../agents/exploratory-charter-author.md)
Step 5, each tour produces:

- **Past:** which paths the tour covered.
- **Results:** what the tour surfaced (per-finding).
- **Outlook:** what the tour didn't reach; recommend follow-up
  charter scope.
- **Obstacles:** what blocked the tour (broken setup, missing test
  data).
- **Feelings:** tester's qualitative read after the tour.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Picking all 7 tours for one session                                   | Tester touches each superficially; no depth.                             | 1-3 tours per 90-min session. |
| Money tour without monetary fields                                    | The tour wastes time on "verify nothing changed."                        | Pick tours per the feature; not all features need every tour. |
| Garbage collector's tour without a sitemap                             | Tester misses pages; coverage gaps invisible.                            | Use the team's sitemap / docs as the seed list. |
| Treating a tour as a checklist                                        | Tour is a heuristic; rigid stepwise application defeats the exploration. | Tester adapts mid-tour as they learn (per the exploratory definition). |
| Bad-data tour with random inputs                                       | Random isn't useful; structured pathological inputs are.                  | Use canonical payloads ([`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md)). |
| Intellectual tour without a domain expert pair                         | Tester misses the actual complexity; tour is shallow.                    | Pair with someone who knows the domain. |
| One tour run per release without rotation                              | The same tour by the same tester catches the same bugs (or none).         | Rotate which tours run, which testers, what scope (Picking section). |

## Limitations

- **Tour effectiveness varies by tester skill.** Senior testers
  apply tours flexibly; junior testers may use them as checklists.
  The vocabulary helps both, but mileage differs.
- **Tour vocabulary is community-conventional.** Whittaker's seven
  are the most widely cited, but some teams use additional tours
  (Performance tour, Security tour, Accessibility tour) — note that
  those overlap with dedicated specialty plugins.
- **No automated tour.** Tours are by definition human-driven. For
  automated equivalents, see the named-tool skills in other
  plugins.

## References

- Whittaker, J., *Exploratory Software Testing* (Addison-Wesley,
  2009) — the canonical taxonomy of the seven tours. Per the
  source-fetch convention, the book is the primary reference;
  community summaries (developsense.com tour-and-testing post) are
  secondary.
- [`exploratory-charter-author`](../../agents/exploratory-charter-author.md)
  — consumer of this reference.
- [`malicious-payload-bank`](../../../qa-test-data/skills/malicious-payload-bank/SKILL.md)
  — canonical payloads for the Bad-data tour.
- [`feature-flag-test-harness`](../../../qa-test-environment/skills/feature-flag-test-harness/SKILL.md)
  — automated complement for the Configuration tour.
