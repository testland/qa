# qa-compatibility

Browser and OS compatibility testing — runs the smoke suite across configured browser/OS matrices, with budget conventions for choosing which combinations to test.

## Components

| Type | Name | Archetype |
|---|---|---|
| Skill | [browser-matrix-runner](skills/browser-matrix-runner/SKILL.md) | S1 |
| Skill | [os-matrix-runner](skills/os-matrix-runner/SKILL.md) | S1 |
| Skill | [compatibility-budget](skills/compatibility-budget/SKILL.md) | S2 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-compatibility@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
