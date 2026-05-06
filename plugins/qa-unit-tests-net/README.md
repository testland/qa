# qa-unit-tests-net

.NET unit testing per-framework wrappers. Three S1 framework skills + 1 S2 assertion-library reference.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [xunit-tests](skills/xunit-tests/SKILL.md) | S1 | xUnit.net (v2 + v3); current .NET de facto; [Fact]/[Theory]/[InlineData]; class+collection fixtures |
| Skill | [nunit-tests](skills/nunit-tests/SKILL.md) | S1 | JVM-style attributes; [Test]/[TestCase]; constraint-model assertions; multiple parametrize attrs |
| Skill | [mstest-tests](skills/mstest-tests/SKILL.md) | S1 | Microsoft first-party; [TestClass]/[TestMethod]; tight Visual Studio integration |
| Skill | [fluentassertions](skills/fluentassertions/SKILL.md) | S2 | Fluent assertion library (.Should() API); pairable with any test framework; v8+ commercial license |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-net@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
