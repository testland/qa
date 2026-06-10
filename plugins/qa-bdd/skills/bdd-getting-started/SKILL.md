---
name: bdd-getting-started
description: "Orients an engineer or BA who is new to BDD in the qa-bdd plugin - maps their existing role (manual tester, business analyst, or developer) to the right starting skill, explains Gherkin's Given/When/Then structure with a minimal example, and routes them onward to authoring and review tooling. Use when an engineer or BA new to BDD does not know where to start in this plugin."
rating: 23
d6: 2
keywords: ["bdd", "gherkin", "getting-started", "three-amigos", "onboarding", "manual-tester", "business-analyst"]
---

# bdd-getting-started
## What is BDD and why does it matter?

Behavior Driven Development (BDD) is "a way for software teams to work that
closes the gap between business people and technical people"
([cucumber.io/docs/bdd][bdd-what]). It works through three repeating steps:
Discovery (structured conversations around concrete examples),
Formulation (writing those examples in an automatable format), and
Automation (implementing behavior guided by the resulting tests).

The formulation language is **Gherkin** - "a set of special keywords to give
structure and meaning to executable specifications"
([cucumber.io/docs/gherkin/reference][gherkin-ref]).
Gherkin files are plain text, readable by everyone on the team, not just
developers.

The three roles who collaborate on writing Gherkin are known as the
**Three Amigos** ([cucumber.io/docs/bdd/who-does-what][three-amigos]):

- **Product Owner or BA** - defines scope, decides what is in/out, brings
  user intent.
- **Tester** - generates scenarios and edge cases, asks "how will this
  break?"
- **Developer** - adds step detail and considers implementation constraints.

"These conversations can produce great tests, because each amigo sees the
product from a different perspective."
([cucumber.io/docs/bdd/who-does-what][three-amigos])

## Minimal Gherkin example

```gherkin
Feature: Apply promo code at checkout

  Scenario: Valid code reduces subtotal
    Given a logged-in user with a cart containing "BOOK-001" at $24.99
    When the user applies promo code "WELCOME10"
    Then the subtotal is $22.49
```

Per the Gherkin reference ([cucumber.io/docs/gherkin/reference][gherkin-ref]):

- **Given** - "the initial context of the system... puts the system in a
  known state."
- **When** - "an event, or an action... a person interacting with the
  system."
- **Then** - "an expected outcome, or result... use an assertion to compare
  the actual outcome to the expected outcome."

Steps should stay in business language. Avoid UI mechanics
("clicks button #submit") - `gherkin-style-reviewer` will flag those.

## Which skill to start with?

### You are a manual tester migrating scripts to BDD

Start with [`manual-step-to-gherkin`](../manual-step-to-gherkin/SKILL.md).
It translates an existing manual test step (table row, prose bullet,
TestRail/Qase export) into declarative Gherkin, stripping UI mechanics and
elevating user intent. This is the bridge path from manual test scripts into
the BDD workflow without requiring you to know Cucumber or step definitions
first.

### You are a BA writing acceptance criteria

Start with [`gherkin-from-stories`](../gherkin-from-stories/SKILL.md) to
convert user stories directly into Gherkin. It extracts the
actor/capability/value triple from "As a... I want... so that..." stories,
maps each acceptance criterion to a Scenario block, and flags axes suitable
for Scenario Outlines. Alternatively, if your team practices ATDD and you
work from acceptance criteria rather than full stories, use
[`acceptance-test-from-criteria`](../acceptance-test-from-criteria/SKILL.md)
to generate executable tests that map back to individual ACs.

### You have Gherkin and need step definitions wired to your runner

Use the [`bdd-scenario-author`](../../agents/bdd-scenario-author.md) agent.
It takes a story or acceptance criteria, produces Gherkin, and scaffolds
step definitions for whichever runner is detected in your project:
Cucumber (JVM/JS/Ruby), Behave (Python), or Reqnroll (.NET). Once you know
your runner, the dedicated skill provides full install and run guidance:
[`cucumber-testing`](../cucumber-testing/SKILL.md),
[`behave-testing`](../behave-testing/SKILL.md), or
[`reqnroll-testing`](../reqnroll-testing/SKILL.md).

### You have written Feature files and want a quality check

Run [`gherkin-style-reviewer`](../../agents/gherkin-style-reviewer.md).
It flags imperative steps, technical leakage (DB names, CSS selectors),
excessive And-chains, missing Background extraction, and Then-clauses with
no observable outcome. Use it during PR review against any `*.feature` file.

## Hard rejects (d6 = 0 rule)

This skill does not scaffold step definitions or run any test framework.
Invoke it only to orient yourself - then proceed to the skill or agent that
matches your role above. Do not use this skill as a substitute for a runner
skill (`cucumber-testing`, `behave-testing`, `reqnroll-testing`).

## References

- [bdd-what][bdd-what] - "a way for software teams to work that closes the
  gap between business people and technical people."
- [gherkin-ref][gherkin-ref] - authoritative Given/When/Then keyword
  definitions and Gherkin syntax.
- [three-amigos][three-amigos] - Three Amigos roles, contributions, and
  discovery workshop guidance.

[bdd-what]: https://cucumber.io/docs/bdd/
[gherkin-ref]: https://cucumber.io/docs/gherkin/reference/
[three-amigos]: https://cucumber.io/docs/bdd/who-does-what/
