# qa-ai-assisted

AI-assisted test generation + curation. AI-generated tests from natural-language specs, coverage gap mapping, an adversarial reviewer for AI-generated tests (catches hallucinations, weak assertions, redundancy), plus a model-based-test graph authoring skill that produces structured input AI test generators benefit from.

## Components

| Type | Name | Archetype |
|---|---|---|
| skill | [ai-test-generator](skills/ai-test-generator/SKILL.md) | S3 |
| skill | [ai-spec-coverage-mapper](skills/ai-spec-coverage-mapper/SKILL.md) | S3 |
| skill | [model-based-test-graph-author](skills/model-based-test-graph-author/SKILL.md) | S3 |
| agent | [ai-test-curator](agents/ai-test-curator.md) | A3 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-ai-assisted@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
