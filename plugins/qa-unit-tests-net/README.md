# qa-unit-tests-net

.NET unit testing in one umbrella skill: xUnit.net as the primary
framework, with framework choice (xUnit for new, match existing
otherwise), test-authoring conventions, and NUnit, MSTest, and
FluentAssertions as bundled references.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [dotnet-unit-tests](skills/dotnet-unit-tests/SKILL.md) | xUnit [Fact]/[Theory] parametrization / fixtures / parallelism / ITestOutputHelper / CI, framework choice from csproj PackageReferences, and test-authoring conventions; references cover NUnit, MSTest, and FluentAssertions (incl. the v8 commercial-license change) |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-net@testland-qa
```
