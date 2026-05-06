# qa-mutation-testing

Mutation testing across the major language ecosystems. Mutation testing inserts small bugs (mutants) into production code; if tests pass, they don't actually catch the regressions. Surviving mutants reveal weak assertions and missing edge-case tests that coverage hides.

## Components

| Type | Name | Archetype |
|---|---|---|
| Skill | [stryker-mutation](skills/stryker-mutation/SKILL.md) | S1 |
| Skill | [stryker-net-mutation](skills/stryker-net-mutation/SKILL.md) | S1 |
| Skill | [pitest-mutation](skills/pitest-mutation/SKILL.md) | S1 |
| Skill | [mutmut-mutation](skills/mutmut-mutation/SKILL.md) | S1 |
| Skill | [mull-mutation](skills/mull-mutation/SKILL.md) | S1 |
| Agent | [mutation-survivor-explainer](agents/mutation-survivor-explainer.md) | A1 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-mutation-testing@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
