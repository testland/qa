# qa-ai-assisted

AI-assisted test generation + curation. AI-generated tests from natural-language specs, coverage gap mapping, two adversarial reviewers for AI-generated tests (one catches hallucinations / weak assertions / redundancy, the other catches shallow happy-path-only input-domain coverage), plus a model-based-test graph authoring skill that produces structured input AI test generators benefit from.

## Components

| Type | Name | Archetype |
|---|---|---|
| Skill | [ai-test-generator](skills/ai-test-generator/SKILL.md) | S3 |
| Skill | [ai-spec-coverage-mapper](skills/ai-spec-coverage-mapper/SKILL.md) | S3 |
| Skill | [model-based-test-graph-author](skills/model-based-test-graph-author/SKILL.md) | S3 |
| Agent | [ai-test-curator](agents/ai-test-curator.md) | A3 |
| Agent | [ai-test-shallow-coverage-critic](agents/ai-test-shallow-coverage-critic.md) | A3 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ai-assisted@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
