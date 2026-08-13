# qa-ai-assisted

AI-assisted test generation + curation. AI-generated tests from natural-language specs, coverage gap mapping, and two adversarial reviewers for AI-generated tests: one catches hallucinations / weak assertions / redundancy, the other owns the input-domain coverage audit (equivalence partitioning, boundary values, negative paths) that catches shallow happy-path-only suites. The model-based-test graph authoring skill produces structured state-machine input and runs the full graph-to-suite pipeline.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [ai-test-generator](skills/ai-test-generator/SKILL.md) | Build-an-X workflow that uses an LLM to generate tests from natural-language specs (acceptance criteria, user stories) - outputs tests with confidence scoring per case (LLM's own self-assessment + heuristics: assertion-quality, naming, completeness), batches uncertain cases for human review, integrates with the team's existing test framework. Critical: AI-generated tests are unreliable without curation; pairs with `ai-test-curator` (the adversarial reviewer). Use when a team has many AC to convert and wants AI-augmentation, not AI-replacement. |
| Skill | [ai-spec-coverage-mapper](skills/ai-spec-coverage-mapper/SKILL.md) | Build-an-X workflow that uses an LLM to map existing tests to spec sections - given a spec doc + the test suite, the LLM identifies which tests cover which sections, surfaces uncovered sections (gap), and recommends specific tests to add. Output is a coverage matrix per spec ID. Use as a follow-up to `ai-test-generator` (which generates tests for new ACs) - this maps the existing landscape and finds what's missing. |
| Skill | [model-based-test-graph-author](skills/model-based-test-graph-author/SKILL.md) | Build-an-X workflow for model-based testing (MBT) - authors a state-machine model of the SUT (states + transitions + guards + actions), validates the model is connected and complete, and runs the full graph-to-suite pipeline: coverage criterion, covering paths, the path-to-acceptance-criteria bridge `ai-test-generator` consumes, and suite assembly with confidence tiers plus a curation note. Use when a complex stateful flow (checkout, onboarding, multi-step wizard) needs systematic coverage that ad-hoc tests miss. |
| Agent | [ai-test-curator](agents/ai-test-curator.md) | Adversarial reviewer for AI-generated tests - reads the LLM's output and flags hallucinated APIs (functions / classes / imports the LLM invented), weak assertions (`.toBeTruthy()` style), redundancy with existing tests, missing setup/teardown, and naming patterns the LLM defaults to. Refuses to mark generated tests \"ready\" if any high-confidence issue remains. Use as the required downstream gate for `ai-test-generator` - never merge AI-generated tests without this curator's approval. |
| Agent | [ai-test-shallow-coverage-critic](agents/ai-test-shallow-coverage-critic.md) | Adversarial reviewer that flags tests covering only the happy path - owns the input-domain coverage audit: per public entry point it scores equivalence partitioning (clustering the literal values tests actually pass), boundary value analysis (n/a when no ordered bound is declared), and error/negative-path coverage (negative-assertion ratio), emitting a PASS / SHALLOW / N-A verdict per axis with evidence. Distinct from `ai-test-curator` (hallucinated APIs, weak assertions) and `test-code-critic` (vague matchers). Use as the required downstream gate after any AI-assisted test generation, including `ai-test-generator`, Copilot-suggested tests, and Cursor-authored tests. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ai-assisted@testland-qa
```
