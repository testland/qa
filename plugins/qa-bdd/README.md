# qa-bdd

Behavior-driven development pipelines: per-language Cucumber-family runners (Cucumber-JVM/JS/Ruby, Behave Python, Reqnroll .NET — replaces SpecFlow), step-library curation, Gherkin style review, story-to-Gherkin authoring, ATDD acceptance-test generation from criteria.

## Components

| Type | Name | Archetype |
|---|---|---|
| skill | [cucumber-testing](skills/cucumber-testing/SKILL.md) | S1 |
| skill | [behave-testing](skills/behave-testing/SKILL.md) | S1 |
| skill | [reqnroll-testing](skills/reqnroll-testing/SKILL.md) | S1 |
| skill | [specflow-testing](skills/specflow-testing/SKILL.md) | S1 (legacy) |
| skill | [bdd-step-library-curator](skills/bdd-step-library-curator/SKILL.md) | S3 |
| skill | [gherkin-from-stories](skills/gherkin-from-stories/SKILL.md) | S3 |
| skill | [acceptance-test-from-criteria](skills/acceptance-test-from-criteria/SKILL.md) | S3 |
| agent | [gherkin-style-reviewer](agents/gherkin-style-reviewer.md) | A3 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bdd@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
