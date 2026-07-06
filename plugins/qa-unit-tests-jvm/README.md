# qa-unit-tests-jvm

JVM unit testing per-framework wrappers. Five skills covering Java + Kotlin + Scala + Groovy test frameworks, plus one orchestrator that authors a single test per spec by detecting the framework convention from the project's build file.

Per-framework lifecycle scope. Does **not** duplicate
`qa-test-review` (test code hygiene).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [junit5-tests](skills/junit5-tests/SKILL.md) | JUnit 5 (Jupiter); modern JVM standard; @Test/@ParameterizedTest/@RepeatedTest; extension model |
| Skill | [kotest-tests](skills/kotest-tests/SKILL.md) | Kotlin-native; multi-style (StringSpec/FunSpec/BehaviorSpec); built-in property-based |
| Skill | [spock-tests](skills/spock-tests/SKILL.md) | Groovy BDD; given/when/then blocks; data tables; built-in mocking |
| Skill | [testng-tests](skills/testng-tests/SKILL.md) | Test method dependencies; groups; suite XML; legacy + Selenium-tradition |
| Skill | [scalatest](skills/scalatest/SKILL.md) | Scala-native; multi-style (FlatSpec/FunSuite/WordSpec); ScalaCheck pairing |
| Agent | [jvm-test-author](agents/jvm-test-author.md) | Authors one JVM unit test per spec; detects JUnit 5 / TestNG / Kotest / Spock / ScalaTest from pom.xml / build.gradle[.kts] / build.sbt; pairs with AssertJ when present |
| Agent | [jvm-framework-selector](agents/jvm-framework-selector.md) | Reads pom.xml/build.gradle/build.sbt + language and recommends one JVM test framework (JUnit 5 / TestNG / Kotest / Spock / ScalaTest). |
| Skill | [assertj](skills/assertj/SKILL.md) | AssertJ fluent assertions for JVM tests: assertThat, collection/exception/soft assertions, recursive comparison, custom assertions. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-unit-tests-jvm@testland-qa
```
