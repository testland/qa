---
name: fcc-cuts-vids-heuristic
description: "Pure-reference catalog of Michael Kelly's FCC CUTS VIDS touring heuristic (2005): eleven tours - Feature, Complexity, Claims, Configuration, User, Testability, Scenario, Variability, Interoperability, Data, Structure - each a reconnaissance sweep that builds familiarity with an unfamiliar application. Use when onboarding onto a product or opening a first session on an unknown area, before a charter is scoped. Distinct from exploratory-tours-reference (Whittaker's seven tours, which frame a bug-hunting mission on a product the tester already knows), sfdpot-exploratory-heuristic (what to vary), hiccupps-f-heuristic (oracles), and crusspic-stmpl-heuristic (quality criteria)."
---

# fcc-cuts-vids-heuristic

## Overview

FCC CUTS VIDS is Michael Kelly's touring heuristic, published on his
blog on 20 September 2005. It names **eleven tours**, each a short
reconnaissance pass over an application with one question in mind. Kelly
introduced it as a companion to his test-reporting heuristic, writing
"I think I will need something similar for application touring. Here is
my attempt: FCC CUTS VIDS"
([michaeldkelly.com](https://michaeldkelly.com/blog/2005/9/20/touring-heuristic.html)).

The tours answer *what does this product even consist of* - they are
aimed at a tester who does not yet know the application. That is the
axis that separates them from the seven tours in
`exploratory-tours-reference`, which come from Whittaker's *Exploratory
Software Testing* (2009) and frame a themed bug hunt on a product the
tester already understands. Kelly's tours precede that work by four
years and are used earlier in the lifecycle: recon first, mission after.

This skill is a **pure reference** consumed by testers building
familiarity with a new product or a newly inherited area.

## When to use

- **Onboarding** onto an unfamiliar product, before any charter is
  written.
- **Inheriting an area** nobody on the team has tested recently.
- **Opening a first session** on a feature whose shape is unknown, to
  decide what is worth chartering at all.
- **Filling a gap mid-session** when the tester realises they cannot
  answer a basic question about the system.

Do not reach for this once the product is well understood; at that point
a themed mission from `exploratory-tours-reference` is the better tool.

## How to use

1. **Pick a target.** One application, or one area of it, in a sentence.
2. **Run a subset of tours, not all eleven.** Each is a short pass with
   one question. Three or four chosen for the unknowns that actually
   matter beat a mechanical sweep through the full list.
3. **Take notes per tour** so the pass produces a record, not just a
   feeling of familiarity.
4. **Convert the gaps into charters.** A tour that raises more questions
   than it answers has found the area worth a session. Hand those to
   `session-based-test-management-reference` to charter and time-box.

## The eleven tours

Each description below is Kelly's own wording. Full prompts and worked
examples: [references/tours-catalog.md](references/tours-catalog.md).

| Group | Tour | Kelly's description |
|---|---|---|
| **FCC** | **F - Feature** | "Move through the application and get familiar with all the controls and features you come across." |
| | **C - Complexity** | "Find the five most complex things about the application." |
| | **C - Claims** | "Find all the information in the product that tells you what the product does." |
| **CUTS** | **C - Configuration** | "Attempt to find all the ways you can change settings in the product in a way that the application retains those settings." |
| | **U - User** | "Imagine five users for the product and the information they would want from the product or the major features they would be interested in." |
| | **T - Testability** | "Find all the features you can use as testability features and/or identify tools you have available that you can use to help in your testing." |
| | **S - Scenario** | "Imagine five realistic scenarios for how the users identified in the user tour would use this product." |
| **VIDS** | **V - Variability** | "Look for things you can change in the application - and then you try to change them." |
| | **I - Interoperability** | "What does this application interact with?" |
| | **D - Data** | "Identify the major data elements of the application." |
| | **S - Structure** | "Find everything you can about what comprises the physical product (code, interfaces, hardware, files, etc...)." |

The User and Scenario tours are ordered: Scenario builds on the personas
the User tour produced, so run User first.

## Anti-patterns

| Anti-pattern | Why it fails | Do instead |
|---|---|---|
| Running all eleven tours on every product | The heuristic is a menu, not a checklist; eleven shallow passes crowd out one useful one | Pick the tours that target what is actually unknown |
| Treating a tour as a test pass | A tour builds familiarity; it is not coverage and finds bugs only incidentally | Charter a session for the risks the tour surfaced |
| Confusing these with Whittaker's tours | Different author, different set, different lifecycle stage | Kelly's eleven for recon, `exploratory-tours-reference` for themed missions |
| Attributing the mnemonic to James Bach | It is Kelly's, from his own blog | Cite michaeldkelly.com |
| Touring without notes | The familiarity evaporates and the next tester starts over | Record findings per tour so gaps become charters |

## Limitations

- The tours are a **learning** aid. They do not establish coverage, and
  a product that has been toured is not a product that has been tested.
- Kelly's original post gives one sentence per tour and no worked
  example; the prompts in the catalog reference are elaboration, not
  Kelly's text, and are marked as such.
- The set is from 2005 and predates mobile, cloud, and API-first
  products. The Interoperability and Structure tours carry most of the
  weight for those, but the list has no tour aimed squarely at, say, a
  third-party identity provider.

## References

- Kelly M. *Touring Heuristic*, 20 September 2005 -
  [michaeldkelly.com/blog/2005/9/20/touring-heuristic.html](https://michaeldkelly.com/blog/2005/9/20/touring-heuristic.html)
  (the primary source: the mnemonic and all eleven descriptions).
- Full per-tour prompts and worked examples:
  [references/tours-catalog.md](references/tours-catalog.md).
- Sibling references:
  `exploratory-tours-reference` (Whittaker's seven tours),
  `sfdpot-exploratory-heuristic`,
  `hiccupps-f-heuristic`,
  `crusspic-stmpl-heuristic`,
  `session-based-test-management-reference`.
