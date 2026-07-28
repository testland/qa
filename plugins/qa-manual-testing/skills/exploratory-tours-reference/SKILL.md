---
name: exploratory-tours-reference
description: "Pure-reference catalog of the seven exploratory testing tours from Whittaker's Exploratory Software Testing (2009): Feature, Money, Landmark, Intellectual, Bad-data, Configuration, and Garbage-collector's, each a themed mission with the signal it surfaces and a worked example. Use as the menu a charter author picks session themes from. Distinct from the mnemonic catalogs sfdpot-exploratory-heuristic (what to vary) and hiccupps-f-heuristic (oracles), and from session-based-test-management-reference, which manages the sessions."
---

# exploratory-tours-reference

## Overview

**Tours** keep an exploratory session focused: each tour frames the
exploration around a theme that catches a specific class of bugs. The
seven canonical tours come from James Whittaker's *Exploratory Software
Testing* (2009, Addison-Wesley).

This skill is a **pure reference** - the charter author and the tester
pick which tours to apply per session.

## When to use

- Authoring a charter and choosing which tours to suggest to the
  tester.
- Mid-session, the tester wants a different lens to break out of a
  rut.
- Onboarding new exploratory testers who need vocabulary for
  "what kind of testing am I doing right now?"

## How to use

1. **Name the mission.** State what the session must learn (new
   feature, post-refactor regression, bug-cluster hunt, compliance
   audit).
2. **Choose 1-3 tours.** Use the *Picking tours per charter* table to
   map the mission to tours. A 90-minute charter fits 1-3 tours, never
   all seven.
3. **Read each chosen tour's detail** in
   [references/tours-catalog.md](references/tours-catalog.md) - its
   mission, signal, worked example, and when-to-use notes.
4. **Run each tour as a lens, not a checklist.** Adapt mid-tour as you
   learn; pair the Bad-data tour with `malicious-payload-bank` (a
   canonical starter payload for that step: `'; DROP TABLE users; --` to
   probe SQL-injection escaping) and the Intellectual tour with a
   domain-expert guide.
5. **Capture findings per tour** with the PROOF fields (*Capturing
   tour findings* below).
6. **File into the session sheet** (`session-based-test-management-reference`)
   and rotate tours, testers, and scope across releases.

## The seven tours

Each tour is a themed mission that catches one class of bug. Full
mission, signal, worked example, and when-to-use per tour:
[references/tours-catalog.md](references/tours-catalog.md).

| Tour | Mission | Signal it surfaces |
|---|---|---|
| **Feature** | Visit every in-scope feature at depth 1 | Does the feature exist / open / work? |
| **Money** | Find every place money / pricing / discount appears; verify each | Rounding, currency drift, discount-stacking, locale formatting |
| **Landmark** | Visit the canonical hero flows | Marquee features still work after a refactor |
| **Intellectual** | Explore the hardest-to-explain features | Bugs in genuinely complex business logic |
| **Bad-data** | Feed pathological inputs | Validation gaps, error handling, security, locale parsing |
| **Configuration** | Vary user / system config | Config-dependent bugs (flags, theme, locale, browser) |
| **Garbage collector's** | Visit every page / endpoint once | Dead links, 404s, stale routes, render issues |

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

Per the PROOF debrief format, each tour produces:

- **Past:** which paths the tour covered.
- **Results:** what the tour surfaced (per-finding).
- **Outlook:** what the tour didn't reach; recommend follow-up
  charter scope.
- **Obstacles:** what blocked the tour (broken setup, missing test
  data).
- **Feelings:** tester's qualitative read after the tour.

## Worked example - a new promo-checkout charter

Charter: "Explore the new promo-code checkout with sample carts to
discover discount + input bugs."

```markdown
1. Mission: new-feature exploration.
2. Pick tours (from the table): Feature + Money (money present) + Bad-data.
3. **Feature tour:** open checkout; promo field renders; apply button works. Pass.
4. **Money tour:** apply 10% off to a $24.99 cart → expect $22.49. Then
   stack two promos and check order of operations. FOUND: "STACK50"
   applies after tax instead of before, reproduces 3/3.
5. **Bad-data tour:** paste a 5000-char code → expect rejection;
   `'; DROP TABLE users; --` → expect escaping. Both handled.
```

Result: one confirmed bug (B-001, promo applied post-tax) logged to
the session sheet; Outlook recommends a follow-up Configuration-tour
charter for EU-VAT carts.

## Anti-patterns

Seven common ways a tour is misapplied (all-7-in-one-session, checklist
rigidity, random Bad-data inputs, no rotation) and the fix for each:
[references/tour-anti-patterns.md](references/tour-anti-patterns.md).

## Limitations

- **Effectiveness varies by tester skill.** Seniors apply tours
  flexibly; juniors may fall back to using them as checklists.
- **Tour vocabulary is community-conventional.** Whittaker's seven
  are the most widely cited, but some teams use additional tours
  (Performance tour, Security tour, Accessibility tour) - note that
  those overlap with dedicated specialty plugins.
- **No automated tour.** Tours are by definition human-driven. For
  automated equivalents, see the named-tool skills in other
  plugins.

## References

- Whittaker, J., *Exploratory Software Testing* (Addison-Wesley,
  2009) - the canonical taxonomy of the seven tours. Per the
  source-fetch convention, the book is the primary reference;
  community summaries (developsense.com tour-and-testing post) are
  secondary.
- Full per-tour mission, signal, and example:
  [references/tours-catalog.md](references/tours-catalog.md).
- Tour anti-patterns and their fixes:
  [references/tour-anti-patterns.md](references/tour-anti-patterns.md).
- `malicious-payload-bank` - canonical payloads for the Bad-data tour.
- `feature-flag-test-harness` - automated complement for the Configuration tour.
