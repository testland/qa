# qa-unit-tests-net

.NET unit testing per-framework wrappers + orchestrator agents. Three framework skills + 1 assertion-library reference + 2 agents.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [xunit-tests](skills/xunit-tests/SKILL.md) | xUnit.net (v2 + v3); current .NET de facto; [Fact]/[Theory]/[InlineData]; class+collection fixtures |
| Skill | [nunit-tests](skills/nunit-tests/SKILL.md) | JVM-style attributes; [Test]/[TestCase]; constraint-model assertions; multiple parametrize attrs |
| Skill | [mstest-tests](skills/mstest-tests/SKILL.md) | Microsoft first-party; [TestClass]/[TestMethod]; tight Visual Studio integration |
| Skill | [fluentassertions](skills/fluentassertions/SKILL.md) | Fluent assertion library (.Should() API); pairable with any test framework; v8+ commercial license |
| Agent | [dotnet-test-framework-selector](agents/dotnet-test-framework-selector.md) | Reads target csproj/sln + sibling test projects; detects existing convention; recommends one of xUnit / NUnit / MSTest with rationale |
| Agent | [dotnet-test-author](agents/dotnet-test-author.md) | Authors one .NET unit test given a target method + behavior spec; detects framework + FluentAssertions from csproj; emits idiomatic xUnit/NUnit/MSTest test file |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-net@testland-qa
```
