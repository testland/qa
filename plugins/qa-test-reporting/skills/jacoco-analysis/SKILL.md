---
name: jacoco-analysis
description: "Configures JaCoCo for JVM projects (Java / Kotlin / Scala / Groovy) - wires the runtime agent via `jacoco-maven-plugin` `prepare-agent`, generates per-build reports (HTML / XML / CSV) via the `report` goal, gates the build via the `check` goal with element / limit / minimum rules, parses the six native counters (instructions, branches, lines, methods, classes, cyclomatic complexity), and converts JaCoCo XML to LCOV / Cobertura when downstream tools need a different format. Use when the JVM build is Maven / Gradle and the team wants the canonical JVM coverage tool - or to convert JaCoCo output for cross-language coverage aggregation."
---

# jacoco-analysis

## Overview

JaCoCo (the canonical JVM coverage tool) instruments Java bytecode
at runtime via a Java agent, then aggregates execution data into
per-class / per-method / per-line reports.

Per [jacoco-counters][counters], JaCoCo measures **six counters**:

[counters]: https://www.jacoco.org/jacoco/trunk/doc/counters.html

| Counter            | Definition                                                                                            |
|--------------------|--------------------------------------------------------------------------------------------------------|
| **Instructions** (C0) | "The smallest unit JaCoCo counts are single Java byte code instructions." |
| **Branches** (C1)     | Coverage "for all `if` and `switch` statements." |
| **Lines**             | "A source line is considered executed when at least one instruction that is assigned to this line has been executed." |
| **Methods**           | "A method is considered as executed when at least one instruction has been executed." |
| **Classes**           | "A class is considered as executed when at least one of its methods has been executed." |
| **Cyclomatic Complexity** | "v(G) = B - D + 1 (branches minus decision points plus one)" - minimum number of paths needed to cover all paths through a method. |

This skill covers Maven (the primary deployment), with the
bytecode-only key insight: **"All counters work at bytecode level,
making them available regardless of debug information presence"**
([jacoco-counters][counters]). Gradle, the XML parser, and the
cross-language conversions live in the reference file.

## When to use

- A JVM project (Java / Kotlin / Scala / Groovy) needs coverage and
  the team is on Maven or Gradle.
- A Cobertura-based pipeline is migrating to JaCoCo (typical:
  Cobertura is unmaintained for JDK 11+; JaCoCo handles modern
  bytecode).
- Cross-language aggregation needs JaCoCo XML converted to LCOV /
  Cobertura.

## How to use

1. Confirm the JVM build is Maven / Gradle (see When to use).
2. Wire the `jacoco-maven-plugin` with the three primary goals -
   `prepare-agent`, `report`, `check` (below); Gradle's equivalent
   is in [references/gradle-parsing-and-ci.md](references/gradle-parsing-and-ci.md).
3. Run `mvn verify`; read the `check` verdict and the HTML at
   `target/site/jacoco/index.html`.
4. Gate on INSTRUCTION + BRANCH ratios, then parse `jacoco.xml` for
   PR comments and convert to LCOV / Cobertura for cross-language
   aggregation - the parser, the counter-aware gating table, the
   format conversions, and the full Maven `verify` CI job are in
   [references/gradle-parsing-and-ci.md](references/gradle-parsing-and-ci.md).

## Wire the Maven plugin

Per [jacoco-maven][jmvn], the plugin defines several goals; the
three primary ones are **`prepare-agent`**, **`report`**, and
**`check`** ([jacoco-maven][jmvn]):

[jmvn]: https://www.jacoco.org/jacoco/trunk/doc/maven.html

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.13</version>
  <executions>
    <execution>
      <id>prepare-agent</id>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>verify</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
    <execution>
      <id>check</id>
      <phase>verify</phase>
      <goals>
        <goal>check</goal>
      </goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>INSTRUCTION</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.80</minimum>
              </limit>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>0.70</minimum>
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

`prepare-agent` configures the JaCoCo runtime agent for the
forked test JVM; `report` generates HTML / XML / CSV from
`target/jacoco.exec`; `check` enforces thresholds.

Per [jacoco-maven][jmvn]: "Maven 3.0 or higher and Java 1.8 or
higher for the Maven runtime, Java 1.5 or higher for the test
executor."

## Report formats

The `report` goal emits three artifacts under `target/site/jacoco/`:

| File                | Format               | Use                                                       |
|---------------------|----------------------|-----------------------------------------------------------|
| `index.html` + assets | HTML drill-down     | Human review.                                              |
| `jacoco.xml`        | XML (with DTD)       | CI parsing; Cobertura-shape conversion.                    |
| `jacoco.csv`        | CSV per-class        | Spreadsheets; quick scripting.                              |

For Maven multi-module projects, the per-module reports go under
each module's `target/site/jacoco/`. For an aggregated report, use
the `report-aggregate` goal in a parent module.

## Gating with the `check` goal

The `check` goal accepts a list of rules; each rule scopes by
**element** (BUNDLE / PACKAGE / CLASS / SOURCEFILE / METHOD) and
constrains via **limits** with **counter / value / minimum or
maximum**:

```xml
<rules>
  <rule>
    <element>BUNDLE</element>
    <limits>
      <limit>
        <counter>INSTRUCTION</counter>
        <value>COVEREDRATIO</value>
        <minimum>0.80</minimum>
      </limit>
    </limits>
  </rule>
  <rule>
    <element>CLASS</element>
    <excludes>
      <exclude>*Test</exclude>
      <exclude>*IT</exclude>
    </excludes>
    <limits>
      <limit>
        <counter>METHOD</counter>
        <value>MISSEDCOUNT</value>
        <maximum>0</maximum>
      </limit>
    </limits>
  </rule>
</rules>
```

The two-rule pattern: a `BUNDLE` (whole-project) floor + a per-`CLASS`
strict rule for production code (excluding tests).

`value` options (per the JaCoCo Maven plugin's check-mojo docs):

| `value`             | Meaning                                |
|---------------------|----------------------------------------|
| `COVEREDRATIO`      | Hit / total (0.0 to 1.0).              |
| `MISSEDRATIO`       | Missed / total (0.0 to 1.0).           |
| `COVEREDCOUNT`      | Absolute number hit.                   |
| `MISSEDCOUNT`       | Absolute number missed.                |
| `TOTALCOUNT`        | Absolute total.                        |

`minimum` floors the value; `maximum` caps it. Counter options are
`INSTRUCTION` / `BRANCH` / `LINE` / `METHOD` / `CLASS` / `COMPLEXITY`
(per [jacoco-counters][counters]). Gate on INSTRUCTION for the
whole-repo floor and BRANCH separately, with a bounded METHOD miss:

```xml
<limit><counter>INSTRUCTION</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
<limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>0.70</minimum></limit>
<limit><counter>METHOD</counter><value>MISSEDCOUNT</value><maximum>5</maximum></limit>
```

Whole-bundle 80% instruction; 70% branch; allow up to 5 untested
methods. The per-counter "when to gate on which" table is in
[references/gradle-parsing-and-ci.md](references/gradle-parsing-and-ci.md).

## Worked example

A Maven service wiring JaCoCo for the first time:

1. Add the plugin block above to `pom.xml` (all three executions:
   `prepare-agent`, `report`, `check`).
2. Run the build:

```bash
./mvnw -B verify
```

`prepare-agent` instruments the forked test JVM; the tests write
`target/jacoco.exec`; `report` renders `target/site/jacoco/index.html`;
`check` evaluates the rules.

If instruction coverage lands at 82% but branch coverage is 66%, the
build fails on the BRANCH rule (minimum 0.70), naming the bundle and
the missed limit. Open `target/site/jacoco/index.html`, drill into
the red (missed) branches, add the tests that exercise them, and
re-run `./mvnw -B verify` until `check` passes.

## Operating in CI

Run `./mvnw -B verify` so `check` gates the build, then upload
`target/site/jacoco/` with `if: always()` (coverage matters most on
runs that failed the gate). For a coverage SaaS or cross-language
aggregation, convert `jacoco.xml` to LCOV in the same job and upload
that. The full GitHub Actions workflow (verify, artifact upload,
`xml2lcov` conversion, SaaS upload) is in
[references/gradle-parsing-and-ci.md](references/gradle-parsing-and-ci.md).

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                              | Fix |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping `prepare-agent`                                            | Tests run without instrumentation; coverage data empty.                  | Always include `prepare-agent` (see Wire the Maven plugin). |
| Whole-project rule with `INSTRUCTION` only                          | Branch regressions invisible - line% looks fine while branch% drops.     | Separate INSTRUCTION + BRANCH rules (see Gating with the check goal). |
| `<element>BUNDLE</element>` on every rule                           | Per-class violations bury inside an aggregate that passes.               | Add a per-CLASS rule with `excludes` for tests (see Gating with the check goal). |
| Using JaCoCo report HTML as PR-comment input                        | HTML is for humans; PR comments need machine-readable.                   | Parse `jacoco.xml` (see references); generate the comment from there. |
| Running JaCoCo on test code                                          | "Coverage" of tests is meaningless and inflates aggregate.               | `excludes` for `*Test`, `*IT`, `*Spec` (see Gating with the check goal). |
| Aggregating LINE coverage when methods are short                    | Inflated; the coarse-grained measure looks fine.                          | Pair LINE with BRANCH always (see the counter-aware table in references). |
| Failing the build on COMPLEXITY without a tested floor              | Forces refactors of legitimately complex code (algorithms).               | Use COMPLEXITY as informational; gate on INSTRUCTION + BRANCH. |

## Limitations

- **Bytecode-level only.** Per [jacoco-counters][counters], all
  counters work at bytecode level - useful for source-format
  independence but means kotlinc / scalac inlining can produce
  surprising line-coverage shapes.
- **Per-method `desc=` is JVM signature.** Cross-source-language
  reports (Kotlin generates JVM methods) need the source file as
  the pivot, not the method descriptor.
- **`prepare-agent` only instruments forked test JVMs.** Surefire's
  `forkCount=0` (run-in-Maven-JVM mode) bypasses the agent; coverage
  data is empty. Use the default fork mode.
- **No PR-context awareness.** Pair with
  `coverage-diff-reporter` for
  the diff vs main.

## References

- [jacoco-counters][counters] - six counters (instructions, branches,
  lines, methods, classes, cyclomatic complexity), bytecode-level
  measurement, formula for cyclomatic complexity.
- [jacoco-maven][jmvn] - `prepare-agent` / `report` / `check`
  goals; Maven + JVM version requirements; HTML report output path.
- [references/gradle-parsing-and-ci.md](references/gradle-parsing-and-ci.md) -
  the Gradle plugin config, the `jacoco.xml` parser, the counter-aware
  gating table, JaCoCo-to-Cobertura / LCOV conversion, and the Maven
  `verify` CI job.
- `cobertura-analysis` - sister
  parser; JaCoCo XML can convert to Cobertura XML for sibling tooling.
- `lcov-analysis` - sister parser; JaCoCo
  can convert to LCOV for cross-language aggregation.
- `coverage-diff-reporter`,
  `test-coverage-targeter` - downstream skills consuming the parsed JaCoCo output.
