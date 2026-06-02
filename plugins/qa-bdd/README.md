# qa-bdd

Behavior-driven development pipelines: per-language Cucumber-family runners (Cucumber-JVM/JS/Ruby, Behave Python, Reqnroll .NET - replaces SpecFlow), step-library curation, Gherkin style review, story-to-Gherkin authoring, ATDD acceptance-test generation from criteria.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [cucumber-testing](skills/cucumber-testing/SKILL.md) | S1 | Configures Cucumber for BDD scenarios - Cucumber-JVM (Java/Kotlin via JUnit 5), Cucumber-JS (Node), Cucumber-Ruby. Authors `.feature` files in Gherkin, writes step definitions in the host language, runs via the framework's runner, integrates with JUnit XML reporting. Use as the canonical Cucumber wrapper for any of the three official implementations. |
| Skill | [behave-testing](skills/behave-testing/SKILL.md) | S1 | Configures Behave for Python BDD scenarios - `pip install behave`, authors `.feature` files in Gherkin, writes step implementations in `features/steps/*.py`, configures via `environment.py` for setup/teardown hooks, organizes via tags, runs via `behave`. Use for Python codebases that want Cucumber-family BDD without Cucumber-Ruby / Cucumber-JS. |
| Skill | [reqnroll-testing](skills/reqnroll-testing/SKILL.md) | S1 | Configures Reqnroll (the canonical .NET BDD framework) - install via `dotnet add package Reqnroll`, author `.feature` files in Gherkin, write step bindings as `[Given/When/Then]`-decorated methods in any C# class, runs via `dotnet test`. Reqnroll is the SpecFlow successor (originated as a community port off the SpecFlow codebase); new .NET BDD work targets Reqnroll. Use for .NET projects starting BDD or migrating from SpecFlow. |
| Skill | [specflow-testing](skills/specflow-testing/SKILL.md) | S1 (legacy) | Legacy support for SpecFlow (.NET BDD framework that predates Reqnroll) - for projects that haven't migrated yet. Mirrors Reqnroll's API closely (Reqnroll is the SpecFlow fork). Body documents the SpecFlow patterns + the migration path to Reqnroll. Per Reqnroll's own positioning, new .NET BDD work targets Reqnroll, not SpecFlow. Use only for existing SpecFlow projects mid-migration; new projects use `reqnroll-testing` instead. |
| Skill | [bdd-step-library-curator](skills/bdd-step-library-curator/SKILL.md) | S3 | Build-an-X workflow that keeps step definitions DRY across a Cucumber / Behave / Reqnroll project - periodically inventories step definitions, finds duplicates (different patterns matching the same intent), suggests consolidation, organizes by domain, and publishes a step library reference doc the team uses for \"is there already a step for X?\" before authoring new ones. Use as the antidote to step-definition proliferation in long-lived BDD projects. |
| Skill | [gherkin-from-stories](skills/gherkin-from-stories/SKILL.md) | S3 | Build-an-X workflow that converts user stories into Gherkin scenarios - extracts the actor / capability / value triple from \"As a … I want … so that …\", maps acceptance criteria to Scenario blocks, identifies parameterizable axes for Scenario Outlines, and emits a Feature file ready for `bdd-step-library-curator`-curated step definitions. Sister to `acceptance-criteria-extractor` (qa-shift-left) - that one handles the AC layer; this skill operates at the user-story layer and produces Gherkin directly. |
| Skill | [acceptance-test-from-criteria](skills/acceptance-test-from-criteria/SKILL.md) | S3 | Build-an-X workflow for ATDD (Acceptance Test-Driven Development) - converts acceptance criteria into executable acceptance tests in the team's BDD framework (Cucumber / Behave / Reqnroll), pairs with the relevant runner, scaffolds step definitions for new patterns, marks generated tests as \"AC-N\" so failures map back to the story's acceptance criterion. Use when the team practices ATDD and wants automation generated from ACs as a first-class step before development. |
| Skill | [manual-step-to-gherkin](skills/manual-step-to-gherkin/SKILL.md) | S3 | Translates an existing manual test step (table row, prose bullet, TestRail/Qase exported step) into a declarative Gherkin Given/When/Then step phrased in business language - strips UI mechanics (\"clicks the button\", \"types in the field\"), elevates the user intent (\"signs in\", \"adds the product\"), and aligns vocabulary with the project's existing step library. Distinct from `gherkin-from-stories` (which works from user stories, not from already-written manual steps) and from `acceptance-test-from-criteria` (which works from acceptance criteria). Use when a team is migrating manual test scripts to BDD, or when a manual tester is handing a script off to an automation engineer. |
| Agent | [gherkin-style-reviewer](agents/gherkin-style-reviewer.md) | A3 | Adversarial reviewer for Gherkin Feature files - flags imperative steps (\"click button #foo\"), technical leakage (DB names / API URLs / CSS selectors in steps), \"And And And\" chains (excessive coordination), missing Background extraction (repeated Givens across scenarios), and Then-without-observable-outcome (vague assertions). Refuses to mark a Feature \"good\" if any flag remains. Use during PR review against `*.feature` files. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bdd@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
