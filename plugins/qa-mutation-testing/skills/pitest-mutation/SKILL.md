---
name: pitest-mutation
description: "Configures PIT (PITest) for mutation testing of JVM projects (Java, Kotlin via the Kotlin plugin) - wires the `pitest-maven` or `pitest-gradle-plugin` with `mutationThreshold`, `coverageThreshold`, target classes/tests filtering, runs `mvn pitest:mutationCoverage`, parses the HTML + XML reports. Use when the JVM suite needs mutation-quality verification - the canonical Java mutation testing tool, fast (PIT analyzes \"in minutes rather than days\")."
rating: 23
d6: 4
archetype: S1
---

# pitest-mutation

## Overview

Per [pit-home][pit]:

[pit]: https://pitest.org/

> "PIT is a mutation testing system for Java and JVM applications.
> It automatically introduces faults into code, then runs tests to
> see if they catch these modifications."
>
> "Faults (or mutations) are automatically seeded into your code,
> then your tests are run. If your tests fail then the mutation is
> killed, if your tests pass then the mutation lived."
> ([pit-home][pit])

Per [pit-home][pit], PIT differentiates on **speed**: "analyzes in
minutes rather than days" vs older mutation tools.

## When to use

- A JVM project (Java, Kotlin via plugin) needs mutation-quality
  verification.
- A team wants to identify "partial testing that traditional metrics
  miss" ([pit-home][pit]).
- Maven / Gradle integration is required (PIT is first-class for
  both).

## Step 1 - Install (Maven)

```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <version>1.17.0</version>
  <configuration>
    <targetClasses>
      <param>com.example.checkout.*</param>
    </targetClasses>
    <targetTests>
      <param>com.example.checkout.*Test</param>
    </targetTests>
    <mutationThreshold>75</mutationThreshold>
    <coverageThreshold>80</coverageThreshold>
    <outputFormats>
      <format>HTML</format>
      <format>XML</format>
    </outputFormats>
  </configuration>
  <dependencies>
    <dependency>
      <groupId>org.pitest</groupId>
      <artifactId>pitest-junit5-plugin</artifactId>
      <version>1.2.1</version>
    </dependency>
  </dependencies>
</plugin>
```

For JUnit 5, the `pitest-junit5-plugin` is required; for JUnit 4
the default plugin works.

## Step 2 - Run

```bash
mvn pitest:mutationCoverage
```

Reports land at `target/pit-reports/<timestamp>/`. The
`index.html` shows per-class mutation coverage.

## Step 3 - Configure (Gradle)

```gradle
plugins {
    id 'java'
    id 'info.solidsoft.pitest' version '1.15.0'
}

pitest {
    targetClasses = ['com.example.checkout.*']
    targetTests = ['com.example.checkout.*Test']
    mutationThreshold = 75
    coverageThreshold = 80
    outputFormats = ['HTML', 'XML']
    junit5PluginVersion = '1.2.1'
}

// Run via:
// ./gradlew pitest
```

## Step 4 - Mutators

PIT's default mutator set covers conditional, arithmetic, return
value, void method calls, and constructor calls. Activate
additional mutator sets via `<mutators>`:

```xml
<mutators>
  <mutator>STRONGER</mutator>     <!-- All default + extra -->
  <mutator>DEFAULTS</mutator>     <!-- Default set -->
  <mutator>ALL</mutator>          <!-- Everything -->
</mutators>
```

Per [pit-home][pit], reports "combine line coverage with mutation
coverage data."

## Step 5 - `pitmp-maven-plugin` for incremental runs

For PRs, only mutate changed code:

```bash
mvn pitest:mutationCoverage -DwithHistory
```

`withHistory` reads / writes a history file in `target/`; subsequent
runs only mutate code different from the cached history. For PR
runs, combine with git diff to scope further:

```bash
mvn pitest:mutationCoverage \
  -Dfeatures='+gitci(level[1])' \
  -Dpitmp.git.diff.target=origin/main
```

(The `pitmp-maven-plugin` extension adds git-diff-based scoping;
not in core PIT.)

## Step 6 - CI integration

```yaml
- uses: actions/setup-java@v4
  with: { distribution: temurin, java-version: '21' }

- name: Mutation testing (full)
  if: github.event_name == 'schedule'  # weekly cron
  run: mvn pitest:mutationCoverage

- name: Mutation testing (incremental, PR)
  if: github.event_name == 'pull_request'
  run: mvn pitest:mutationCoverage -DwithHistory

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: pit-reports
    path: target/pit-reports/
```

The XML output (`mutations.xml`) is machine-parseable for
dashboards.

## Step 7 - Kotlin support

PIT works with Kotlin via standard Maven/Gradle Kotlin plugins;
mutators apply to compiled bytecode. Per [pit-home][pit], "ArcMutate,
from the same team, extends PIT with Kotlin support, Spring
integration, and Git analysis" - for richer Kotlin / Spring
support, evaluate ArcMutate (commercial).

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Mutating the entire codebase every PR                                 | Slow; team disables.                                                      | `withHistory` + per-changed-file scope (Step 5). |
| `mutationThreshold: 100`                                               | Unreachable; first failed run blocks all PRs.                            | Start at the current baseline; ratchet up. |
| Mixed Maven/Gradle config (both plugins active)                        | Conflicting configurations; cryptic errors.                               | Pick one build tool. |
| Missing JUnit 5 plugin dependency                                      | Tests don't run; mutation coverage 0.                                    | Add `pitest-junit5-plugin` for JUnit 5 (Step 1). |
| Targeting test classes in `targetClasses`                              | Mutates test code; meaningless.                                          | `targetClasses` = production package; `targetTests` = test package. |
| All mutators (`ALL` mutator set)                                       | Many irrelevant mutants; long runtime.                                   | `DEFAULTS` (default) or `STRONGER`. |

## Limitations

- **Bytecode-level.** PIT mutates compiled .class files; some
  language-level constructs (Kotlin sealed classes, certain
  generics) produce equivalent mutants.
- **Build-time integration.** Requires Maven / Gradle; standalone
  PIT is awkward for Bazel / Pants.
- **Commercial Kotlin / Spring features.** ArcMutate is paid;
  open-source PIT covers the basics.
- **Per-class scope only.** No file-level or method-level scoping
  out of the box; use `targetClasses` patterns.

## References

- [pit][pit] - PIT overview: mutation testing definition, JVM-only,
  speed claim ("minutes rather than days"), Maven/Gradle/Ant
  integration, ArcMutate Pro extension.
- [`stryker-mutation`](../stryker-mutation/SKILL.md),
  [`stryker-net-mutation`](../stryker-net-mutation/SKILL.md),
  [`mutmut-mutation`](../mutmut-mutation/SKILL.md),
  [`mull-mutation`](../mull-mutation/SKILL.md) - per-language
  siblings.
- [`mutation-survivor-explainer`](../../agents/mutation-survivor-explainer.md) - surviving-mutant analysis agent.
