---
name: jacoco-analysis
description: "Configures JaCoCo for JVM projects (Java / Kotlin / Scala / Groovy) - wires the runtime agent via `jacoco-maven-plugin` `prepare-agent`, generates per-build reports (HTML / XML / CSV) via the `report` goal, gates the build via the `check` goal with element / limit / minimum rules, parses the six native counters (instructions, branches, lines, methods, classes, cyclomatic complexity), and converts JaCoCo XML to LCOV / Cobertura when downstream tools need a different format. Use when the JVM build is Maven / Gradle and the team wants the canonical JVM coverage tool - or to convert JaCoCo output for cross-language coverage aggregation."
rating: 24
d6: 4
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

This skill covers Maven (the primary deployment), with notes on
Gradle and the bytecode-only key insight: **"All counters work at
bytecode level, making them available regardless of debug
information presence"** ([jacoco-counters][counters]).

## When to use

- A JVM project (Java / Kotlin / Scala / Groovy) needs coverage and
  the team is on Maven or Gradle.
- A Cobertura-based pipeline is migrating to JaCoCo (typical:
  Cobertura is unmaintained for JDK 11+; JaCoCo handles modern
  bytecode).
- Cross-language aggregation needs JaCoCo XML converted to LCOV /
  Cobertura (Step 7).

## Step 1 - Wire the Maven plugin

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

## Step 2 - Report formats

The `report` goal emits three artifacts under `target/site/jacoco/`:

| File                | Format               | Use                                                       |
|---------------------|----------------------|-----------------------------------------------------------|
| `index.html` + assets | HTML drill-down     | Human review.                                              |
| `jacoco.xml`        | XML (with DTD)       | CI parsing; Cobertura-shape conversion (Step 7).           |
| `jacoco.csv`        | CSV per-class        | Spreadsheets; quick scripting.                              |

For Maven multi-module projects, the per-module reports go under
each module's `target/site/jacoco/`. For an aggregated report, use
the `report-aggregate` goal in a parent module.

## Step 3 - `check` rule structure

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
(per [jacoco-counters][counters]).

## Step 4 - Gradle equivalent

```gradle
plugins {
  id 'java'
  id 'jacoco'
}

jacoco {
  toolVersion = '0.8.13'
}

test {
  finalizedBy jacocoTestReport
}

jacocoTestReport {
  dependsOn test
  reports {
    xml.required = true
    html.required = true
    csv.required = false
  }
}

jacocoTestCoverageVerification {
  violationRules {
    rule {
      limit {
        counter = 'INSTRUCTION'
        value = 'COVEREDRATIO'
        minimum = 0.80
      }
      limit {
        counter = 'BRANCH'
        value = 'COVEREDRATIO'
        minimum = 0.70
      }
    }
  }
}

check.dependsOn jacocoTestCoverageVerification
```

## Step 5 - Parse `jacoco.xml`

The JaCoCo XML format mirrors the report tree (report → package →
class → method → counter):

```xml
<report name="my-app">
  <package name="com/example/checkout">
    <class name="com/example/checkout/Cart" sourcefilename="Cart.java">
      <method name="addItem" desc="(LItem;)V" line="12">
        <counter type="INSTRUCTION" missed="0" covered="15"/>
        <counter type="BRANCH" missed="1" covered="3"/>
        <counter type="LINE" missed="0" covered="3"/>
        <counter type="METHOD" missed="0" covered="1"/>
        <counter type="COMPLEXITY" missed="0" covered="2"/>
      </method>
      <counter type="INSTRUCTION" missed="0" covered="42"/>
      ...
    </class>
    <counter type="INSTRUCTION" missed="0" covered="100"/>
    ...
  </package>
  <counter type="INSTRUCTION" missed="20" covered="500"/>
  ...
</report>
```

```python
# scripts/parse_jacoco.py
import xml.etree.ElementTree as ET

def parse_jacoco(path):
    root = ET.parse(path).getroot()
    files = []
    for pkg in root.findall('package'):
        for cls in pkg.findall('class'):
            counters = {c.get('type'): {
                            'missed': int(c.get('missed')),
                            'covered': int(c.get('covered')),
                        } for c in cls.findall('counter')}
            files.append({
                'package': pkg.get('name'),
                'name': cls.get('name'),
                'sourcefile': cls.get('sourcefilename'),
                'counters': counters,
            })
    return files
```

## Step 6 - Counter-aware metrics

Per [jacoco-counters][counters], the six counters have different
semantics. Don't aggregate naively:

| Counter      | When to gate on it                                                                  |
|--------------|--------------------------------------------------------------------------------------|
| INSTRUCTION  | The most granular; least sensitive to source formatting. Best whole-repo gate.      |
| LINE         | Most intuitive for reviewers; aggregates per source line.                            |
| BRANCH       | Critical for control flow correctness; gate separately from line.                    |
| METHOD       | Coarse-grained; "any test touched this method" - useful as a "no dead code" floor. |
| CLASS        | Even coarser; "any test touched this class" - proves the test suite at least loads it. |
| COMPLEXITY   | Pair with branch coverage; high-complexity uncovered methods are the highest-risk. |

A pragmatic three-line gate:

```xml
<limit><counter>INSTRUCTION</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
<limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>0.70</minimum></limit>
<limit><counter>METHOD</counter><value>MISSEDCOUNT</value><maximum>5</maximum></limit>
```

Whole-bundle 80% instruction; 70% branch; allow up to 5 untested
methods.

## Step 7 - Cross-language: convert JaCoCo XML

For projects that mix JVM with other languages and want one
coverage UI, convert JaCoCo XML to a sibling format:

### To Cobertura

```bash
# Use the cover2cover.py script (community-maintained):
python cover2cover.py target/site/jacoco/jacoco.xml src/main/java > target/cobertura.xml
```

Then feed [`cobertura-analysis`](../cobertura-analysis/SKILL.md).

### To LCOV

```bash
# Use the xml2lcov converter (per LCOV's language-agnostic converter family):
xml2lcov target/site/jacoco/jacoco.xml > target/jacoco.info
```

Then feed [`lcov-analysis`](../lcov-analysis/SKILL.md).

LCOV is the language-agnostic interchange format; LCOV's own
documentation lists JaCoCo conversion as a supported path.

## Step 8 - CI shape

```yaml
- name: Run Maven verify
  run: ./mvnw -B verify

- name: Upload JaCoCo report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: jacoco
    path: target/site/jacoco/

- name: Convert to LCOV for SaaS
  run: xml2lcov target/site/jacoco/jacoco.xml > target/jacoco.info

- name: Upload to coverage SaaS
  uses: codecov/codecov-action@v5
  with:
    files: target/jacoco.info
```

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                              | Fix |
|--------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Skipping `prepare-agent`                                            | Tests run without instrumentation; coverage data empty.                  | Always include `prepare-agent` (Step 1). |
| Whole-project rule with `INSTRUCTION` only                          | Branch regressions invisible - line% looks fine while branch% drops.     | Separate INSTRUCTION + BRANCH rules (Step 6). |
| `<element>BUNDLE</element>` on every rule                           | Per-class violations bury inside an aggregate that passes.               | Add a per-CLASS rule with `excludes` for tests (Step 3). |
| Using JaCoCo report HTML as PR-comment input                        | HTML is for humans; PR comments need machine-readable.                   | Parse `jacoco.xml` (Step 5); generate the comment from there. |
| Running JaCoCo on test code                                          | "Coverage" of tests is meaningless and inflates aggregate.               | `excludes` for `*Test`, `*IT`, `*Spec` (Step 3). |
| Aggregating LINE coverage when methods are short                    | Inflated; the coarse-grained measure looks fine.                          | Pair LINE with BRANCH always (Step 6). |
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
  [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md) for
  the diff vs main.

## References

- [jacoco-counters][counters] - six counters (instructions, branches,
  lines, methods, classes, cyclomatic complexity), bytecode-level
  measurement, formula for cyclomatic complexity.
- [jacoco-maven][jmvn] - `prepare-agent` / `report` / `check`
  goals; Maven + JVM version requirements; HTML report output path.
- [`cobertura-analysis`](../cobertura-analysis/SKILL.md) - sister
  parser; JaCoCo XML can convert to Cobertura XML for sibling tooling.
- [`lcov-analysis`](../lcov-analysis/SKILL.md) - sister parser; JaCoCo
  can convert to LCOV for cross-language aggregation.
- [`coverage-diff-reporter`](../coverage-diff-reporter/SKILL.md),
  [`unit-test-coverage-targeter`](../unit-test-coverage-targeter/SKILL.md) - downstream skills consuming the parsed JaCoCo output.
