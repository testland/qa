# qa-ai-assisted

AI-assisted test generation + curation. AI-generated tests from natural-language specs, coverage gap mapping, two adversarial reviewers for AI-generated tests (one catches hallucinations / weak assertions / redundancy, the other catches shallow happy-path-only input-domain coverage), plus a model-based-test graph authoring skill that produces structured input AI test generators benefit from.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [ai-test-generator](skills/ai-test-generator/SKILL.md) | Build-an-X workflow that uses an LLM to generate tests from natural-language specs (acceptance criteria, user stories) - outputs tests with confidence scoring per case (LLM's own self-assessment + heuristics: assertion-quality, naming, completeness), batches uncertain cases for human review, integrates with the team's existing test framework. Critical: AI-generated tests are unreliable without curation; pairs with `ai-test-curator` (the adversarial reviewer). Use when a team has many AC to convert and wants AI-augmentation, not AI-replacement. |
| Skill | [ai-spec-coverage-mapper](skills/ai-spec-coverage-mapper/SKILL.md) | Build-an-X workflow that uses an LLM to map existing tests to spec sections - given a spec doc + the test suite, the LLM identifies which tests cover which sections, surfaces uncovered sections (gap), and recommends specific tests to add. Output is a coverage matrix per spec ID. Use as a follow-up to `ai-test-generator` (which generates tests for new ACs) - this maps the existing landscape and finds what's missing. |
| Skill | [model-based-test-graph-author](skills/model-based-test-graph-author/SKILL.md) | Build-an-X workflow for model-based testing (MBT) per the canonical definition - authors a state-machine model of the SUT (states + transitions + guards + actions), validates the model is connected and complete, and feeds the model to a test generator (manual / AI / dedicated MBT tool) that produces test paths covering each transition. Per [Wikipedia](https://en.wikipedia.org/wiki/Model-based_testing): MBT \"leverages model-based design for designing and possibly executing tests.\" Use when a complex stateful flow (checkout, onboarding, multi-step wizard) needs systematic coverage that ad-hoc tests miss. |
| Agent | [ai-test-curator](agents/ai-test-curator.md) | Adversarial reviewer for AI-generated tests - reads the LLM's output and flags hallucinated APIs (functions / classes / imports the LLM invented), weak assertions (`.toBeTruthy()` style), redundancy with existing tests, missing setup/teardown, and naming patterns the LLM defaults to. Refuses to mark generated tests \"ready\" if any high-confidence issue remains. Use as the required downstream gate for `ai-test-generator` - never merge AI-generated tests without this curator's approval. |
| Agent | [ai-test-shallow-coverage-critic](agents/ai-test-shallow-coverage-critic.md) | Adversarial reviewer that flags tests covering only the happy path - same valid input class, same nominal flow, no boundaries, no error branches, no negative cases. Distinct from `ai-test-curator` (which catches hallucinated APIs and weak assertions) and from `assertion-quality-reviewer` (which catches vague matchers): this agent targets **input-domain coverage** using the ISTQB equivalence-partitioning and boundary-value-analysis techniques. Refuses to clear a test file unless the suite covers at least one boundary case and at least one error/negative case per public entry point. Use as the required downstream gate after any AI-assisted test generation, including `ai-test-generator`, Copilot-suggested tests, and Cursor-authored tests. |
| Agent | [mbt-suite-builder](agents/mbt-suite-builder.md) | Single entry point for the model-based-testing pipeline: model graph to covering tests to suite. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ai-assisted@testland-qa
```
