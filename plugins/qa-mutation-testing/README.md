# qa-mutation-testing

Mutation testing across the major language ecosystems. Mutation testing inserts small bugs (mutants) into production code; if tests pass, they don't actually catch the regressions. Surviving mutants reveal weak assertions and missing edge-case tests that coverage hides.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [stryker-mutation](skills/stryker-mutation/SKILL.md) | S1 | Configures StrykerJS for mutation testing of JavaScript / TypeScript / React / Vue / Svelte / Node - picks the test-runner plugin (`@stryker-mutator/jest-runner`, `mocha-runner`, `vitest-runner`, `karma-runner`), authors `stryker.conf.json` with mutate globs + thresholds, runs incremental mode for PRs (only mutate changed files), and reports the mutation score. Use when a JS/TS test suite has ≥80% line coverage and the team wants to verify the tests actually catch bugs (not just touch lines). |
| Skill | [stryker-net-mutation](skills/stryker-net-mutation/SKILL.md) | S1 | Configures Stryker.NET for mutation testing of .NET Core / .NET Framework projects - installs `dotnet-stryker` global tool, scopes mutation to specific csproj, supports xUnit / NUnit / MSTest, authors `stryker-config.json` with thresholds, runs in CI. Use when a .NET test suite needs mutation-quality verification - closes the .NET ecosystem gap left by Stryker.NET being newer than the JS variant. |
| Skill | [pitest-mutation](skills/pitest-mutation/SKILL.md) | S1 | Configures PIT (PITest) for mutation testing of JVM projects (Java, Kotlin via the Kotlin plugin) - wires the `pitest-maven` or `pitest-gradle-plugin` with `mutationThreshold`, `coverageThreshold`, target classes/tests filtering, runs `mvn pitest:mutationCoverage`, parses the HTML + XML reports. Use when the JVM suite needs mutation-quality verification - the canonical Java mutation testing tool, fast (PIT analyzes \"in minutes rather than days\"). |
| Skill | [mutmut-mutation](skills/mutmut-mutation/SKILL.md) | S1 | Configures mutmut for Python mutation testing - `pip install mutmut`, runs via `mutmut run`, browses results via `mutmut browse` or `mutmut results`, applies surviving mutants to disk via `mutmut apply <id>`, suppresses with `# pragma: no mutate` annotations. Configures via `setup.cfg` / `pyproject.toml` with `source_paths` + per-test selection. Use for Python codebases needing mutation-quality verification of pytest / unittest suites. |
| Skill | [mull-mutation](skills/mull-mutation/SKILL.md) | S1 | Configures Mull for mutation testing of C / C++ (and via LLVM IR, Swift / Rust to a lesser extent) - LLVM-based, requires building the project with Mull-compatible LLVM toolchain, runs via `mull-runner` against the test binary. Use when a C/C++ project needs mutation-quality verification - the canonical native-language LLVM-IR-level mutation tool. |
| Agent | [mutation-survivor-explainer](agents/mutation-survivor-explainer.md) | A1 | Read-only investigator that takes a surviving mutant from any mutation testing tool (Stryker / PIT / mutmut / Mull / Stryker.NET) - reads the mutated line + surrounding context + the existing tests that should have caught it, classifies the survival reason (missing test case / weak assertion / equivalent mutant / unreachable code), and proposes the specific test to write to kill the mutant. Use after a mutation run when 5+ mutants survived and the team wants help triaging which to address first. |
| Agent | [mutation-tool-selector](agents/mutation-tool-selector.md) | A2 | Action-taking agent that reads a target project's language + test framework (from `package.json`, `pom.xml`, `pyproject.toml`, `*.csproj`, `CMakeLists.txt`) and recommends ONE mutation testing tool - Stryker (JS/TS), Stryker.NET (.NET), PIT (JVM), Mutmut (Python), or Mull (C/C++) - plus rationale and the preloaded SKILL.md to read next. Distinct from `qa-mutation-testing/mutation-survivor-explainer` (A1 that reads existing mutation results to explain why mutants survived - this agent picks WHICH tool to run). Use when starting a new mutation-testing project and the team has not yet committed to a tool. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-mutation-testing@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
