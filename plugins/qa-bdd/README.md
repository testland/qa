# qa-bdd

Behavior-driven development pipelines: per-language Cucumber-family runners (Cucumber-JVM/JS/Ruby, Behave Python, Reqnroll .NET - replaces the end-of-life SpecFlow), a requirements-to-Gherkin authoring umbrella, step-library curation with scenario coverage mapping, Gherkin style review, and living documentation.

## Start here: picking a runner

BDD runs as three repeating practices - Discovery (talk through concrete examples), Formulation (document them as Gherkin), Automation (implement each example test-first). Runner choice is almost entirely determined by language and build system, because step definitions are written in that language:

| What you find in the repo | Runner | Skill |
|---|---|---|
| `pom.xml` / `build.gradle` (Java, Kotlin), `package.json` (Node), or `Gemfile` (Ruby) | Cucumber-JVM / Cucumber-JS / Cucumber-Ruby | `cucumber-testing` |
| `requirements.txt` / `pyproject.toml` (Python) | Behave | `behave-testing` |
| `*.csproj` / `*.sln` (.NET) - including repos still on the end-of-life SpecFlow | Reqnroll (SpecFlow's maintained successor) | `reqnroll-testing` |
| No stakeholder outside engineering will ever read the feature files | None - write tests directly in your test framework | see the "when BDD is not worth it" test in cucumber-testing's references/runner-selection.md |

The full decision table with citations, per-runner first-run commands, and the SpecFlow end-of-life story live in [cucumber-testing's runner-selection reference](skills/cucumber-testing/references/runner-selection.md).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [cucumber-testing](skills/cucumber-testing/SKILL.md) | Configures Cucumber for BDD scenarios - Cucumber-JVM (Java/Kotlin via JUnit 5), Cucumber-JS (Node), Cucumber-Ruby. Authors `.feature` files in Gherkin, writes step definitions in the host language, runs via the framework's runner, integrates with JUnit XML reporting. Includes the runner-selection reference (decision table, first-run commands, SpecFlow EOL, when BDD is not worth it). |
| Skill | [behave-testing](skills/behave-testing/SKILL.md) | Configures Behave for Python BDD scenarios - `pip install behave`, authors `.feature` files in Gherkin, writes step implementations in `features/steps/*.py`, configures via `environment.py` for setup/teardown hooks, organizes via tags, runs via `behave`. |
| Skill | [reqnroll-testing](skills/reqnroll-testing/SKILL.md) | Configures Reqnroll (the canonical .NET BDD framework, SpecFlow's successor) - install, Gherkin features with Rule blocks, `[Given/When/Then]` step bindings, async steps, hooks, tags, `dotnet test`. Covers the SpecFlow-to-Reqnroll migration; references/specflow-legacy.md maintains not-yet-migrated SpecFlow projects. |
| Skill | [gherkin-from-stories](skills/gherkin-from-stories/SKILL.md) | The requirements-to-Gherkin authoring umbrella - converts a user story, a signed-off acceptance-criteria list (ATDD mode: @AC-N tags, NotImplementedError stubs, traceability table), existing manual test steps (declarative rewrite), or a raw spec / PRD section (AC extraction) into a Feature file, reusing the curated step library and flagging implicit preconditions. |
| Skill | [bdd-step-library-curator](skills/bdd-step-library-curator/SKILL.md) | Keeps step definitions DRY across a Cucumber / Behave / Reqnroll project - inventories step definitions, finds duplicates, suggests consolidation, organizes by domain, publishes a step-library README, and fingerprints new scenarios against the live suite (scenario coverage map: duplicate / partial / gap) before tests are authored. |
| Skill | [living-documentation-publisher](skills/living-documentation-publisher/SKILL.md) | Publish passing Gherkin as stakeholder-facing living documentation (Serenity / cucumber-html-reporter). |
| Agent | [gherkin-style-reviewer](agents/gherkin-style-reviewer.md) | Adversarial reviewer for Gherkin Feature files - flags imperative steps ("click button #foo"), technical leakage (DB names / API URLs / CSS selectors in steps), "And And And" chains, missing Background extraction, and Then-without-observable-outcome. Refuses to mark a Feature "good" if any flag remains. Use during PR review against `*.feature` files. |
| Agent | [bdd-scenario-author](agents/bdd-scenario-author.md) | End-to-end BDD author: story or acceptance criteria to Gherkin to step definitions wired to the detected runner. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bdd@testland-qa
```
