# qa-mutation-testing

Mutation testing across the major language ecosystems. Mutation testing inserts small bugs (mutants) into production code; if tests pass, they don't actually catch the regressions. Surviving mutants reveal weak assertions and missing edge-case tests that coverage hides.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [stryker-mutation](skills/stryker-mutation/SKILL.md) | Configures StrykerJS for mutation testing of JavaScript / TypeScript / React / Vue / Svelte / Node - picks the test-runner plugin (`@stryker-mutator/jest-runner`, `mocha-runner`, `vitest-runner`, `karma-runner`), authors `stryker.conf.json` with mutate globs + thresholds, runs incremental mode for PRs (only mutate changed files), and reports the mutation score. Use when a JS/TS test suite has ≥80% line coverage and the team wants to verify the tests actually catch bugs (not just touch lines). |
| Skill | [stryker-net-mutation](skills/stryker-net-mutation/SKILL.md) | Configures Stryker.NET for mutation testing of .NET Core / .NET Framework projects - installs `dotnet-stryker` global tool, scopes mutation to specific csproj, supports xUnit / NUnit / MSTest, authors `stryker-config.json` with thresholds, runs in CI. Use when a .NET test suite needs mutation-quality verification - closes the .NET ecosystem gap left by Stryker.NET being newer than the JS variant. |
| Skill | [pitest-mutation](skills/pitest-mutation/SKILL.md) | Configures PIT (PITest) for mutation testing of JVM projects (Java, Kotlin via the Kotlin plugin) - wires the `pitest-maven` or `pitest-gradle-plugin` with `mutationThreshold`, `coverageThreshold`, target classes/tests filtering, runs `mvn pitest:mutationCoverage`, parses the HTML + XML reports. Use when the JVM suite needs mutation-quality verification - the canonical Java mutation testing tool, fast (PIT analyzes \"in minutes rather than days\"). |
| Skill | [mutmut-mutation](skills/mutmut-mutation/SKILL.md) | Configures mutmut for Python mutation testing - `pip install mutmut`, runs via `mutmut run`, browses results via `mutmut browse` or `mutmut results`, applies surviving mutants to disk via `mutmut apply <id>`, suppresses with `# pragma: no mutate` annotations. Configures via `setup.cfg` / `pyproject.toml` with `source_paths` + per-test selection. Use for Python codebases needing mutation-quality verification of pytest / unittest suites. |
| Skill | [mull-mutation](skills/mull-mutation/SKILL.md) | Configures Mull for mutation testing of C / C++ (and via LLVM IR, Swift / Rust to a lesser extent) - LLVM-based, requires building the project with Mull-compatible LLVM toolchain, runs via `mull-runner` against the test binary. Use when a C/C++ project needs mutation-quality verification - the canonical native-language LLVM-IR-level mutation tool. |
| Skill | [mutant-survival-triage](skills/mutant-survival-triage/SKILL.md) | Explains why a mutant survived across StrykerJS, PIT, mutmut and Mull - the full read-only investigation workflow (read the mutated line + covering tests, classify the cause, draft the test that would kill it; never auto-rewrites tests). Treats equivalence as undecidable in general. |

## Choosing a tool

One canonical mutation tool per language - detect the language from the
project root and pick the matching row:

| Project signal | Language | Tool | Skill |
| --- | --- | --- | --- |
| `package.json` (with or without TypeScript) | JavaScript / TypeScript | **Stryker** | `stryker-mutation` |
| `*.csproj` / `*.sln` | .NET | **Stryker.NET** | `stryker-net-mutation` |
| `pom.xml` / `build.gradle*` / `*.java` | JVM (Java, Kotlin) | **PIT (PITest)** | `pitest-mutation` |
| `pyproject.toml` / `setup.py` / `requirements.txt` | Python | **Mutmut** | `mutmut-mutation` |
| `CMakeLists.txt` / `Makefile` with C/C++ sources | C / C++ | **Mull** (needs an existing test binary) | `mull-mutation` |

Notes: polyglot repos run one tool per language as separate CI jobs (Stryker
and Stryker.NET are separate codebases with separate mutator catalogs).
Languages outside this table (Rust, Go, Ruby, PHP, Elixir) are not covered -
look for language-native alternatives. Start with the 1-2 most critical
modules, not the whole codebase; gate CI at the team's baseline + N%, not
100% (scores plateau at 70-85% for well-tested code - see
mutant-survival-triage on equivalent mutants).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-mutation-testing@testland-qa
```
